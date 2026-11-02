import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeCasePath } from "@grasscn/tests/case-paths";
import type {
  CheckpointCandidate,
  CheckpointCatalogue,
  CheckpointDeclaration,
  CheckpointResult,
  CheckpointSource,
  ReusableBrowserTest,
} from "@tests/runtime/checkpoint-protocol";

export { browserFilePattern } from "@grasscn/tests/case-paths";

export type {
  BrowserVerification,
  CheckpointCandidate,
  CheckpointCatalogue,
  CheckpointDeclaration,
  CheckpointResult,
  CheckpointSource,
  ReusableBrowserTest,
} from "@tests/runtime/checkpoint-protocol";

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const hasReplayableTestIdentity = (
  record: CheckpointResult
): record is CheckpointResult & { file: string; title: string[] } =>
  Array.isArray(record.title) &&
  record.title.length >= 3 &&
  typeof record.file === "string" &&
  !record.title.some((title) => /[\r\n›]/u.test(title));

const same = (
  a: string[] | CheckpointSource[] | undefined,
  b: string[] | CheckpointSource[] | undefined
) => JSON.stringify(a) === JSON.stringify(b);

const sourceMatches = async function sourceMatches(
  expected: CheckpointCatalogue,
  declaration: CheckpointDeclaration,
  record: CheckpointResult & { file: string; title: string[] },
  file: string,
  spec: string,
  root: string,
  allowedSourceRoot: string
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
};

/** The caller must already match the entire source tree and runtime environment. */
export const reusableBrowserTests = async function reusableBrowserTests(
  candidates: CheckpointCandidate[],
  file: string,
  root: string,
  sourceRoot = root
) {
  file = normalizeCasePath(file);

  const tests = new Map<string, ReusableBrowserTest>();
  const spec = path.resolve(root, "tests", file);
  const source = digest(await readFile(spec));

  const nativeSortValues = [...candidates];
  nativeSortValues.sort((a, b) =>
    (a.report.startedAt ?? a.filename).localeCompare(
      b.report.startedAt ?? b.filename
    )
  );
  for (const candidate of nativeSortValues) {
    const run = path.dirname(candidate.filename);
    const directory = path.join(run, "checkpoints", file);

    let expected: CheckpointCatalogue;
    let records: CheckpointResult[];

    try {
      // SAFETY: checkpoint metadata is written by CheckpointReporter; existing schema/source checks below remain authoritative.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Retain original v2/v3 metadata and every existing integrity guard.
      expected = JSON.parse(
        await readFile(path.join(directory, "expected.json"), "utf-8")
      ) as CheckpointCatalogue;

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

      records = lines.filter(Boolean).map((line) => {
        // SAFETY: complete journal lines follow CheckpointReporter results; malformed JSON still rejects the candidate.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Existing per-record integrity checks remain unchanged below.
        return JSON.parse(line) as CheckpointResult;
      });
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
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

      if (!hasReplayableTestIdentity(record)) {
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

      if (record.verification) {
        for (const artifact of record.verification.artifacts ?? []) {
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
};
