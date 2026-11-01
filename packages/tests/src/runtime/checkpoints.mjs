import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeCasePath } from "@grasscn/tests/case-paths";

export { browserFilePattern } from "@grasscn/tests/case-paths";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function sourceMatches(
  expected,
  declaration,
  record,
  file,
  spec,
  root,
  allowedSourceRoot
) {
  if (expected.schemaVersion === 2) {
    // Old records establish only direct definitions, never a helper-to-wrapper relationship.
    return (
      path.resolve(root, record.file) === spec &&
      (!declaration.file || path.resolve(root, declaration.file) === spec)
    );
  }

  if (
    !expected.sourceRoot ||
    !Array.isArray(declaration.sourceFiles) ||
    !declaration.sourceFiles.length ||
    record.file !== declaration.file ||
    record.definitionFile !== declaration.definitionFile ||
    record.sourceSha256 !== declaration.sourceSha256 ||
    record.definitionSha256 !== declaration.definitionSha256 ||
    !same(record.title, declaration.title) ||
    !same(record.sourceFiles, declaration.sourceFiles)
  ) {
    return false;
  }

  try {
    const sourceRoot = path.resolve(expected.sourceRoot);
    const owner = normalizeCasePath(declaration.file);
    const definition = normalizeCasePath(declaration.definitionFile);

    if (
      normalizeCasePath(
        path
          .relative(expected.rootDir, path.resolve(sourceRoot, owner))
          .replaceAll(path.sep, "/")
      ) !== file
    ) {
      return false;
    }

    const testRelative = normalizeCasePath(
      path.relative(sourceRoot, expected.rootDir).replaceAll(path.sep, "/")
    );

    let currentTestRoot = spec;

    for (const _segment of file.split("/")) {
      currentTestRoot = path.dirname(currentTestRoot);
    }

    const currentSourceRoot = path.resolve(
      currentTestRoot,
      ...testRelative.split("/").map(() => "..")
    );

    const allowedRoot = path.resolve(allowedSourceRoot);
    const outside = path.relative(allowedRoot, currentSourceRoot);

    if (
      outside === ".." ||
      outside.startsWith(`..${path.sep}`) ||
      path.isAbsolute(outside)
    ) {
      return false;
    }

    const required = new Map([
      [owner, declaration.sourceSha256],
      [definition, declaration.definitionSha256],
    ]);

    if (required.size !== declaration.sourceFiles.length) {
      return false;
    }

    for (const source of declaration.sourceFiles) {
      const name = normalizeCasePath(source.file);

      if (
        required.get(name) !== source.sha256 ||
        digest(await readFile(path.resolve(currentSourceRoot, name))) !==
          source.sha256
      ) {
        return false;
      }

      required.delete(name);
    }

    return required.size === 0;
  } catch {
    return false;
  }
}

/** The caller must already match the entire source tree and runtime environment. */
export async function reusableBrowserTests(
  candidates,
  file,
  root,
  sourceRoot = root
) {
  file = normalizeCasePath(file);

  const tests = new Map();
  const spec = path.resolve(root, "tests", file);
  const source = digest(await readFile(spec));

  for (const candidate of [...candidates].toSorted((a, b) =>
    (a.report.startedAt ?? a.filename).localeCompare(
      b.report.startedAt ?? b.filename
    )
  )) {
    const run = path.dirname(candidate.filename);
    const directory = path.join(run, "checkpoints", file);

    let expected;
    let records;

    try {
      expected = JSON.parse(
        await readFile(path.join(directory, "expected.json"), "utf-8")
      );

      if (
        ![2, 3].includes(expected.schemaVersion) ||
        !expected.rootDir ||
        !Array.isArray(expected.tests)
      ) {
        tests.clear();
        continue;
      }

      const raw = await readFile(
        path.join(directory, "results.jsonl"),
        "utf-8"
      );

      const lines = raw.split("\n");

      if (!raw.endsWith("\n")) {
        lines.pop();
      }

      records = lines.filter(Boolean).map((line) => JSON.parse(line));
    } catch (error) {
      if (error.code !== "ENOENT") {
        tests.clear();
      }

      continue;
    }

    const declarations = new Map(expected.tests.map((test) => [test.id, test]));

    for (const record of records) {
      const declaration = declarations.get(record.id);

      if (
        record.status !== "passed" ||
        record.expectedStatus !== "passed" ||
        record.retry !== 0
      ) {
        tests.delete(record.id);
        continue;
      }

      if (
        !declaration ||
        declaration.sourceSha256 !== source ||
        record.sourceChanged !== false
      ) {
        tests.delete(record.id);
        continue;
      }

      if (
        !Array.isArray(record.title) ||
        record.title.length < 3 ||
        typeof record.file !== "string" ||
        record.title.some((title) => /[\r\n›]/.test(title))
      ) {
        tests.delete(record.id);
        continue;
      }

      if (
        !(await sourceMatches(
          expected,
          declaration,
          record,
          file,
          spec,
          root,
          sourceRoot
        ))
      ) {
        tests.delete(record.id);
        continue;
      }

      let intact = true;

      for (const artifact of record.verification?.artifacts ?? []) {
        const output = path.resolve(record.verification.outputDirectory);
        const relative = path.relative(run, output);

        if (
          relative === ".." ||
          relative.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relative) ||
          path.basename(artifact.file) !== artifact.file
        ) {
          intact = false;
          break;
        }

        try {
          if (
            digest(await readFile(path.join(output, artifact.file))) !==
            artifact.pngSha256
          ) {
            intact = false;
          }
        } catch {
          intact = false;
        }
      }

      if (!intact) {
        tests.delete(record.id);
        continue;
      }

      tests.set(record.id, {
        from: candidate.filename,
        id: record.id,
        line: `[${record.title[0]}] › ${file} › ${record.title.slice(2).join(" › ")}`,
        verification: record.verification,
      });
    }
  }

  return [...tests.values()];
}
