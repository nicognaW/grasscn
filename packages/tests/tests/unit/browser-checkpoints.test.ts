import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CheckpointCandidate,
  CheckpointCatalogue,
  CheckpointDeclaration,
} from "@grasscn/tests/checkpoints";
import {
  browserFilePattern,
  reusableBrowserTests,
} from "@grasscn/tests/checkpoints";
import { testRoot } from "@grasscn/tests/paths";
import { packageBin } from "@grasscn/tests/tooling";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

test("browser file filters select exact basenames on Windows and POSIX", () => {
  const pattern = new RegExp(browserFilePattern("select.spec.ts"), "u");
  assert.ok(pattern.test("C:\\repo\\tests\\select.spec.ts"));
  assert.ok(pattern.test("/repo/tests/select.spec.ts"));
  assert.equal(pattern.test("/repo/tests/native-select.spec.ts"), false);
  assert.equal(pattern.test("/repo/tests/selectXspec.ts"), false);
});

interface BrowserCacheFixture {
  candidate: CheckpointCandidate;
  file: string;
  journal: string;
  output: string;
  record: {
    expectedStatus: string;
    file: string;
    id: string;
    retry: number;
    sourceChanged: boolean;
    status: string;
    title: string[];
    verification: {
      artifacts: { file: string; pngSha256: string }[];
      outputDirectory: string;
    };
  };
  root: string;
  save: (records: object[]) => Promise<void>;
}

const fixture = async function fixture(
  run: (context: BrowserCacheFixture) => Promise<void>
) {
  const parent = path.join(testRoot, "test-results", "unit");
  await mkdir(parent, { recursive: true });

  const root = await mkdtemp(path.join(parent, "browser-cache-"));
  const file = "sample.spec.ts";
  const directory = path.join(root, "prior/checkpoints", file);
  const output = path.join(root, "prior/browser/sample");

  try {
    await mkdir(directory, { recursive: true });
    await mkdir(output, { recursive: true });
    await mkdir(path.join(root, "tests"));
    await writeFile(path.join(root, "tests", file), "stable source");

    const id = "test-id";

    const record = {
      expectedStatus: "passed",
      file: `tests/${file}`,
      id,
      retry: 0,
      sourceChanged: false,
      status: "passed",
      title: ["", file, "suite", "case"],
      verification: {
        artifacts: [{ file: "actual.png", pngSha256: hash("rendered bytes") }],
        outputDirectory: output,
      },
    };

    await writeFile(path.join(output, "actual.png"), "rendered bytes");
    await writeFile(
      path.join(directory, "expected.json"),
      JSON.stringify({
        rootDir: path.join(root, "tests"),
        schemaVersion: 2,
        tests: [{ id, sourceSha256: hash("stable source") }],
      })
    );

    const journal = path.join(directory, "results.jsonl");

    const candidate = {
      filename: path.join(root, "prior/verification.json"),
      report: { startedAt: "2026-10-31T00:00:00Z" },
    };

    const save = async (records: object[]) => {
      await writeFile(
        journal,
        `${records.map((checkpointRecord) => JSON.stringify(checkpointRecord)).join("\n")}\n`
      );
    };

    await run({ candidate, file, journal, output, record, root, save });
  } finally {
    assert.equal(path.dirname(root), parent);
    await rm(root, { force: true, recursive: true });
  }
};

test("checkpoints retain only source-identical successful tests and intact artifacts", async () => {
  await fixture(async ({ root, file, record, save, candidate, output }) => {
    await save([record]);
    const retained = await reusableBrowserTests([candidate], file, root);
    assert.equal(retained.length, 1);
    assert.equal(retained[0].line, "[] › sample.spec.ts › suite › case");
    await writeFile(path.join(output, "actual.png"), "changed bytes");
    assert.deepEqual(await reusableBrowserTests([candidate], file, root), []);
    await writeFile(path.join(output, "actual.png"), "rendered bytes");
    await writeFile(path.join(root, "tests", file), "changed source");
    assert.deepEqual(await reusableBrowserTests([candidate], file, root), []);
  });
});

test("failures and retries supersede earlier passes; interrupted writes do not create passes", async () => {
  await fixture(async ({ root, file, record, save, candidate, journal }) => {
    for (const failed of [
      { ...record, status: "failed" },
      { ...record, retry: 1 },
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- Rewrites one checkpoint journal for the current failure/retry state and verifies it before the next rewrite.
      await save([record, failed]);
      // oxlint-disable-next-line no-await-in-loop -- Rewrites one checkpoint journal for the current failure/retry state and verifies it before the next rewrite.
      assert.deepEqual(await reusableBrowserTests([candidate], file, root), []);
    }

    await writeFile(journal, `${JSON.stringify(record)}\n{"id":"unfinished"`);

    const awaitedUnitRead1 = await reusableBrowserTests(
      [candidate],
      file,
      root
    );

    assert.equal(awaitedUnitRead1.length, 1);
    await writeFile(journal, `{"id":"unfinished"\n${JSON.stringify(record)}\n`);
    assert.deepEqual(await reusableBrowserTests([candidate], file, root), []);
  });
});

test("a corrupt newer journal cannot recover an older pass", async () => {
  await fixture(async ({ root, file, record, save, candidate }) => {
    await save([record]);
    const directory = path.join(root, "newer/checkpoints", file);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "expected.json"),
      await readFile(
        path.join(root, "prior/checkpoints", file, "expected.json")
      )
    );
    await writeFile(
      path.join(directory, "results.jsonl"),
      `corrupt interior record\n${JSON.stringify(record)}\n`
    );

    const newer = {
      filename: path.join(root, "newer/verification.json"),
      report: { startedAt: "2026-10-31T00:00:01Z" },
    };

    assert.deepEqual(
      await reusableBrowserTests([candidate, newer], file, root),
      []
    );
  });
});

test("Playwright can retain a complete file without repeating its tests", async () => {
  await fixture(async ({ root, file, candidate }) => {
    const reporter = fileURLToPath(
      import.meta.resolve("@grasscn/tests/checkpoint-reporter")
    );

    await writeFile(
      path.join(root, "playwright.config.mjs"),
      'export default {testDir:"./tests",workers:1};'
    );
    await writeFile(
      path.join(root, "tests", file),
      'import {test,expect} from "@playwright/test";import {appendFileSync} from "node:fs";for(const name of ["first","second"])test(name,()=>{appendFileSync("runs.txt",name+"\\n");expect(name.length).toBeGreaterThan(0)});'
    );

    const run = (args: string[], env: NodeJS.ProcessEnv = {}) => {
      const result = spawnSync(
        process.execPath,
        [
          packageBin("@playwright/test", "playwright"),
          "test",
          "--config=playwright.config.mjs",
          ...args,
        ],
        { cwd: root, encoding: "utf-8", env: { ...process.env, ...env } }
      );

      assert.equal(result.status, 0, result.stdout + result.stderr);
    };

    run(
      [
        `--reporter=list,${reporter}`,
        `--output=${path.join(root, "prior/browser")}`,
      ],
      {
        GRASSCN_CHECKPOINT_REPORT_DIR: path.join(
          root,
          "prior/checkpoints",
          file
        ),
      }
    );
    const retained = await reusableBrowserTests([candidate], file, root);
    assert.equal(retained.length, 2);
    const list = path.join(root, "retained.txt");
    await writeFile(
      list,
      `${retained.map((record) => record.line).join("\n")}\n`
    );
    run([
      "--test-list-invert",
      list,
      "--pass-with-no-tests",
      `--output=${path.join(root, "second/browser")}`,
    ]);

    const awaitedUnitRead2 = await readFile(
      path.join(root, "runs.txt"),
      "utf-8"
    );

    assert.deepEqual(awaitedUnitRead2.trim().split("\n"), ["first", "second"]);
  });
});

test("nested browser file filters match the same exact case path on Windows and POSIX", () => {
  const pattern = new RegExp(browserFilePattern("button/native.spec.ts"), "u");
  assert.ok(pattern.test("C:\\repo\\tests\\button\\native.spec.ts"));
  assert.ok(pattern.test("/repo/tests/button/native.spec.ts"));
  assert.equal(pattern.test("/repo/tests/input/native.spec.ts"), false);
  assert.equal(pattern.test("/repo/tests/not-button/native.spec.ts"), false);
  assert.throws(() => browserFilePattern("../button/native.spec.ts"));
});

test("nested helper-defined checkpoints retain only both source-identical inputs", async () => {
  await fixture(async ({ root, record, candidate }) => {
    const file = "button/native.spec.ts";
    const owner = `tests/${file}`;
    const definition = "src/family.mjs";

    await mkdir(path.dirname(path.join(root, owner)), { recursive: true });
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, owner), "wrapper source");
    await writeFile(path.join(root, definition), "helper source");

    const sourceFiles = [
      { file: owner, sha256: hash("wrapper source") },
      { file: definition, sha256: hash("helper source") },
    ];

    const declaration = {
      definitionFile: definition,
      definitionSha256: sourceFiles[1].sha256,
      file: owner,
      id: record.id,
      sourceFiles,
      sourceSha256: sourceFiles[0].sha256,
      title: ["", file, "suite", "case"],
    };

    const directory = path.join(root, "prior/checkpoints", file);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "expected.json"),
      JSON.stringify({
        repositoryRoot: root,
        rootDir: path.join(root, "tests"),
        schemaVersion: 3,
        sourceRoot: root,
        tests: [declaration],
      })
    );
    await writeFile(
      path.join(directory, "results.jsonl"),
      `${JSON.stringify({ ...record, ...declaration })}\n`
    );

    const awaitedUnitRead3 = await reusableBrowserTests(
      [candidate],
      file,
      root
    );

    assert.equal(awaitedUnitRead3.length, 1);
    await writeFile(path.join(root, definition), "changed helper");
    assert.deepEqual(await reusableBrowserTests([candidate], file, root), []);
    await writeFile(path.join(root, definition), "helper source");
    await writeFile(path.join(root, owner), "changed wrapper");
    assert.deepEqual(await reusableBrowserTests([candidate], file, root), []);
  });
});

test("Playwright checkpoints bind a nested owning file separately from its declaring helper", async () => {
  await fixture(async ({ root, candidate }) => {
    await rm(path.join(root, "tests/sample.spec.ts"));

    const definition = "src/declare.mjs";
    const file = "button/helper-owned.spec.ts";
    const directory = path.join(root, "prior/checkpoints", file);

    await mkdir(path.join(root, "tests/button"), { recursive: true });
    await mkdir(path.join(root, "src"));
    await writeFile(
      path.join(root, "playwright.config.mjs"),
      'export default {testDir:"./tests",workers:1};'
    );
    await writeFile(
      path.join(root, "tests", file),
      'import {declare} from "../../src/declare.mjs";declare();'
    );
    await writeFile(
      path.join(root, definition),
      'import {test} from "@playwright/test";import {appendFileSync} from "node:fs";export function declare(){test("helper case",()=>appendFileSync("runs.txt","executed\\n"))}'
    );

    const reporter = fileURLToPath(
      import.meta.resolve("@grasscn/tests/checkpoint-reporter")
    );

    const result = spawnSync(
      process.execPath,
      [
        packageBin("@playwright/test", "playwright"),
        "test",
        "--config=playwright.config.mjs",
        `--reporter=list,${reporter}`,
        `--output=${path.join(root, "prior/browser")}`,
      ],
      {
        cwd: root,
        encoding: "utf-8",
        env: { ...process.env, GRASSCN_CHECKPOINT_REPORT_DIR: directory },
      }
    );

    assert.equal(result.status, 0, result.stdout + result.stderr);

    // SAFETY: this fixture runs our current reporter, which emits complete v3 declarations.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Metadata is the actual output of CheckpointReporter in this test.
    const metadata = JSON.parse(
      await readFile(path.join(directory, "expected.json"), "utf-8")
    ) as Omit<CheckpointCatalogue, "tests"> & {
      tests: Required<CheckpointDeclaration>[];
    };

    const [decl] = metadata.tests;

    assert.equal(
      await readFile(path.join(root, "runs.txt"), "utf-8"),
      "executed\n"
    );
    assert.equal(metadata.schemaVersion, 3);
    assert.equal(decl.file, `tests/${file}`);
    assert.equal(decl.definitionFile, definition);
    assert.equal(decl.sourceFiles.length, 2);

    const awaitedUnitRead4 = await reusableBrowserTests(
      [candidate],
      file,
      root
    );

    assert.equal(awaitedUnitRead4.length, 1);
    await writeFile(path.join(root, definition), "changed helper source");
    assert.deepEqual(await reusableBrowserTests([candidate], file, root), []);
  });
});
