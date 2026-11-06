import { createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

import { relativeCaseFile } from "@grasscn/tests/case-paths";
import { repoRoot } from "@grasscn/tests/paths";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import type {
  BrowserVerification,
  CheckpointDeclaration,
} from "@tests/runtime/checkpoint-protocol";

interface RecordedDeclaration extends CheckpointDeclaration {
  sourceFiles: { file: string; sha256: string }[];
}

const hasCheckpointDirectory = (
  directory: string | undefined
): directory is string => (directory?.length ?? 0) > 0;

const sourceFileHash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

export default class CheckpointReporter implements Reporter {
  directory: string | undefined;
  sources: Map<string, string>;
  declarations: Map<string, RecordedDeclaration>;
  counts: Record<TestResult["status"], number>;
  changed: Set<string>;
  testRoot = "";
  sourceRoot = "";
  constructor() {
    this.directory = process.env.GRASSCN_CHECKPOINT_REPORT_DIR;
    this.sources = new Map();
    this.declarations = new Map();
    this.counts = {
      failed: 0,
      interrupted: 0,
      passed: 0,
      skipped: 0,
      timedOut: 0,
    };
    this.changed = new Set();
  }
  owner(test: TestCase) {
    for (
      let suite: Suite | undefined = test.parent;
      suite;
      suite = suite.parent
    ) {
      if (suite.type === "file") {
        return path.resolve(this.testRoot, suite.title);
      }
    }

    return test.location.file;
  }
  onBegin(config: FullConfig, suite: Suite) {
    if (!hasCheckpointDirectory(this.directory)) {
      return;
    }

    this.testRoot = config.rootDir;
    this.sourceRoot = path.dirname(config.rootDir);
    const all = suite.allTests();

    const inputs = all.flatMap((test) => [
      this.owner(test),
      test.location.file,
    ]);

    while (
      inputs.some((file) => {
        const relative = path.relative(this.sourceRoot, file);

        return (
          relative === ".." ||
          relative.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relative)
        );
      })
    ) {
      const parent = path.dirname(this.sourceRoot);

      if (parent === this.sourceRoot) {
        throw new Error("Checkpoint sources have no common root");
      }

      this.sourceRoot = parent;
    }

    mkdirSync(this.directory, { recursive: true });

    const tests = all.map((test) => {
      const owner = this.owner(test);
      const definition = test.location.file;

      const files = [...new Set([owner, definition])];

      for (const file of files) {
        if (!this.sources.has(file)) {
          this.sources.set(file, sourceFileHash(file));
        }
      }

      const declaration = {
        definitionFile: relativeCaseFile(this.sourceRoot, definition),
        definitionSha256: this.sourceHash(definition),
        file: relativeCaseFile(this.sourceRoot, owner),
        id: test.id,
        line: test.location.line,
        sourceFiles: files.map((file) => ({
          file: relativeCaseFile(this.sourceRoot, file),
          sha256: this.sourceHash(file),
        })),
        sourceSha256: this.sourceHash(owner),
        title: test.titlePath().slice(1),
      };

      this.declarations.set(test.id, declaration);

      return declaration;
    });

    writeFileSync(
      path.join(this.directory, "expected.json"),
      `${JSON.stringify(
        {
          repositoryRoot: repoRoot,
          rootDir: config.rootDir,
          schemaVersion: 3,
          sourceRoot: this.sourceRoot,
          startedAt: new Date().toISOString(),
          tests,
          workers: config.workers,
        },
        null,
        2
      )}\n`
    );
    writeFileSync(path.join(this.directory, "results.jsonl"), "");
  }
  sourceHash(file: string): string {
    const retained = this.sources.get(file);

    if (retained !== undefined) {
      return retained;
    }

    const hash = sourceFileHash(file);
    this.sources.set(file, hash);

    return hash;
  }
  onTestEnd(test: TestCase, result: TestResult) {
    if (!hasCheckpointDirectory(this.directory)) {
      return;
    }

    // SAFETY: Playwright calls onBegin with every test before onTestEnd; that complete suite populates this map.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Retain the reporter lifecycle's existing required declaration without adding a runtime check.
    const declaration = this.declarations.get(test.id) as RecordedDeclaration;
    let changed = false;

    for (const source of declaration.sourceFiles) {
      const file = path.resolve(this.sourceRoot, source.file);

      if (sourceFileHash(file) !== source.sha256) {
        this.changed.add(file);
        changed = true;
      }
    }

    this.counts[result.status] = (this.counts[result.status] ?? 0) + 1;

    const attachment = result.attachments.find(
      (item) => item.name === "grasscn-verification-artifacts"
    );

    // SAFETY: the named attachment is emitted by our verification fixture with this protocol.
    const verification = attachment
      ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: the named attachment is emitted by the general verification fixture.
        (JSON.parse(
          attachment.body?.toString() ??
            readFileSync(
              // SAFETY: the owned attachment producer and Playwright transport supply either an inline body or a file path.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- This branch runs only when the protocol attachment has no inline body.
              attachment.path as string,
              "utf-8"
            )
        ) as BrowserVerification)
      : undefined;

    appendFileSync(
      path.join(this.directory, "results.jsonl"),
      `${JSON.stringify({
        ...declaration,
        durationMs: result.duration,
        errors: result.errors.map((error) => error.message?.slice(0, 1000)),
        expectedStatus: test.expectedStatus,
        retry: result.retry,
        sourceChanged: changed,
        status: result.status,
        verification,
      })}\n`
    );
  }
  onEnd(result: FullResult) {
    if (hasCheckpointDirectory(this.directory)) {
      writeFileSync(
        path.join(this.directory, "summary.json"),
        `${JSON.stringify(
          {
            changedSources: [...this.changed],
            counts: this.counts,
            finishedAt: new Date().toISOString(),
            status: result.status,
          },
          null,
          2
        )}\n`
      );
    }
  }
}
