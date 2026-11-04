import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeCasePath } from "@grasscn/tests/case-paths";
import type {
  BrowserVerification,
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

const hasSourcePath = (file: string | undefined): file is string =>
  (file?.length ?? 0) > 0;

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

const resolveCheckpointSourceRoot = (
  recordedSourceRoot: string,
  recordedTestRoot: string,
  owner: string,
  file: string,
  spec: string,
  allowedSourceRoot: string
) => {
  const sourceRoot = path.resolve(recordedSourceRoot);

  if (
    normalizeCasePath(
      path
        .relative(recordedTestRoot, path.resolve(sourceRoot, owner))
        .replaceAll(path.sep, "/")
    ) !== file
  ) {
    return null;
  }

  const testRelative = normalizeCasePath(
    path.relative(sourceRoot, recordedTestRoot).replaceAll(path.sep, "/")
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
    return null;
  }

  return currentSourceRoot;
};

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
      (!hasSourcePath(declaration.file) ||
        path.resolve(root, declaration.file) === spec)
    );
  }

  if (
    !hasSourcePath(expected.sourceRoot) ||
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
    const owner = normalizeCasePath(declaration.file);
    const definition = normalizeCasePath(declaration.definitionFile);

    const currentSourceRoot = resolveCheckpointSourceRoot(
      expected.sourceRoot,
      expected.rootDir,
      owner,
      file,
      spec,
      allowedSourceRoot
    );

    if (currentSourceRoot === null) {
      return false;
    }

    const required = new Map([
      [owner, declaration.sourceSha256],
      [definition, declaration.definitionSha256],
    ]);

    if (required.size !== declaration.sourceFiles.length) {
      return false;
    }

    const sourceTargets: { file: string; sha256: string }[] = [];

    for (const source of declaration.sourceFiles) {
      const name = normalizeCasePath(source.file);

      if (required.get(name) !== source.sha256) {
        return false;
      }

      sourceTargets.push({
        file: path.resolve(currentSourceRoot, name),
        sha256: source.sha256,
      });
      required.delete(name);
    }

    // Establish complete declared owner membership before starting any independent source read.
    const sourceInputs = await Promise.allSettled(
      sourceTargets.map(async (target) => ({
        bytes: await readFile(target.file),
        sha256: target.sha256,
      }))
    );

    for (const sourceInput of sourceInputs) {
      if (
        sourceInput.status === "rejected" ||
        digest(sourceInput.value.bytes) !== sourceInput.value.sha256
      ) {
        return false;
      }
    }

    return required.size === 0;
  } catch {
    return false;
  }
};

const verificationArtifactsIntact = async (
  verification: BrowserVerification,
  run: string
) => {
  let intact = true;

  const artifactInputs = await Promise.allSettled(
    (verification.artifacts ?? []).map(async (artifact) => {
      const output = path.resolve(verification.outputDirectory);
      const relative = path.relative(run, output);

      if (
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative) ||
        path.basename(artifact.file) !== artifact.file
      ) {
        return null;
      }

      try {
        return (
          digest(await readFile(path.join(output, artifact.file))) ===
          artifact.pngSha256
        );
      } catch {
        return false;
      }
    })
  );

  for (const artifactInput of artifactInputs) {
    if (artifactInput.status === "rejected") {
      throw artifactInput.reason;
    }

    if (artifactInput.value === null) {
      intact = false;
      break;
    }

    if (!artifactInput.value) {
      intact = false;
    }
  }

  return intact;
};

const readCheckpointJournal = async (directory: string) => {
  // SAFETY: checkpoint metadata is written by CheckpointReporter; existing schema/source checks below remain authoritative.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Retain original v2/v3 metadata and every existing integrity guard.
  const expected = JSON.parse(
    await readFile(path.join(directory, "expected.json"), "utf-8")
  ) as CheckpointCatalogue;

  if (
    ![2, 3].includes(expected.schemaVersion) ||
    !expected.rootDir ||
    !Array.isArray(expected.tests)
  ) {
    return null;
  }

  const raw = await readFile(path.join(directory, "results.jsonl"), "utf-8");

  const lines = raw.split("\n");

  if (!raw.endsWith("\n")) {
    lines.pop();
  }

  const records = lines.filter(Boolean).map(
    (line) =>
      // SAFETY: complete journal lines follow CheckpointReporter results; malformed JSON still rejects the candidate.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Existing per-record integrity checks remain unchanged below.
      JSON.parse(line) as CheckpointResult
  );

  return { expected, records };
};

/** The caller must already match the entire source tree and runtime environment. */
export const reusableBrowserTests = async function reusableBrowserTests(
  candidates: CheckpointCandidate[],
  requestedFile: string,
  root: string,
  sourceRoot = root
) {
  const file = normalizeCasePath(requestedFile);

  const tests = new Map<string, ReusableBrowserTest>();
  const spec = path.resolve(root, "tests", file);
  const source = digest(await readFile(spec));

  const nativeSortValues = [...candidates];
  nativeSortValues.sort((a, b) =>
    (a.report.startedAt ?? a.filename).localeCompare(
      b.report.startedAt ?? b.filename
    )
  );

  const candidateInputs = await Promise.allSettled(
    nativeSortValues.map(async (candidate) => {
      const run = path.dirname(candidate.filename);
      const directory = path.join(run, "checkpoints", file);
      const [journalInput] = await Promise.allSettled([
        readCheckpointJournal(directory),
      ]);

      if (journalInput.status === "rejected" || journalInput.value === null) {
        return { journalInput, recordInputs: [] };
      }

      const { expected, records } = journalInput.value;
      const declarations = new Map(
        expected.tests.map((test) => [test.id, test])
      );

      const recordInputs = await Promise.allSettled(
        records.map(async (record) => {
          const declaration = declarations.get(record.id);

          if (
            record.status !== "passed" ||
            record.expectedStatus !== "passed" ||
            record.retry !== 0
          ) {
            return { id: record.id, reusable: null };
          }

          if (
            !declaration ||
            declaration.sourceSha256 !== source ||
            record.sourceChanged !== false
          ) {
            return { id: record.id, reusable: null };
          }

          if (!hasReplayableTestIdentity(record)) {
            return { id: record.id, reusable: null };
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
            return { id: record.id, reusable: null };
          }

          if (
            record.verification &&
            !(await verificationArtifactsIntact(record.verification, run))
          ) {
            return { id: record.id, reusable: null };
          }

          return {
            id: record.id,
            reusable: {
              from: candidate.filename,
              id: record.id,
              line: `[${record.title[0]}] › ${file} › ${record.title.slice(2).join(" › ")}`,
              verification: record.verification,
            },
          };
        })
      );

      return { journalInput, recordInputs };
    })
  );

  for (const candidateInput of candidateInputs) {
    if (candidateInput.status === "rejected") {
      throw candidateInput.reason;
    }

    const { journalInput, recordInputs } = candidateInput.value;

    try {
      if (journalInput.status === "rejected") {
        throw journalInput.reason;
      }

      if (journalInput.value === null) {
        tests.clear();
        continue;
      }
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        tests.clear();
      }

      continue;
    }

    for (const recordInput of recordInputs) {
      if (recordInput.status === "rejected") {
        throw recordInput.reason;
      }

      const { id, reusable } = recordInput.value;

      if (reusable === null) {
        tests.delete(id);
        continue;
      }

      tests.set(id, reusable);
    }
  }

  return [...tests.values()];
};
