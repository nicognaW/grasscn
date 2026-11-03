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

export default class CheckpointReporter implements Reporter {
  directory: string | undefined;
  sources: Map<string, string>;
  declarations: Map<
    string,
    CheckpointDeclaration & { sourceFiles: { file: string; sha256: string }[] }
  >;
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
    if (!this.directory) {
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
          this.sources.set(file, this.hash(file));
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

    const hash = this.hash(file);
    this.sources.set(file, hash);

    return hash;
  }
  hash(file: string) {
    return createHash("sha256").update(readFileSync(file)).digest("hex");
  }
  onTestEnd(test: TestCase, result: TestResult) {
    if (!this.directory) {
      return;
    }

    const declaration = (this.declarations.get(test.id))!;
    let changed = false;

    for (const source of declaration.sourceFiles) {
      const file = path.resolve(this.sourceRoot, source.file);

      if (this.hash(file) !== source.sha256) {
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
          attachment.body?.toString() ?? readFileSync((attachment.path)!, "utf-8")
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
    if (this.directory) {
      writeFileSync(
        path.join(this.directory, "summary.json"),
        `${JSON.stringify(
          {
            status: result.status,
            finishedAt: new Date().toISOString(),
            counts: this.counts,
            changedSources: [...this.changed],
          },
          null,
          2
        )}\n`
      );
    }
  }
}
