import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, writeFile, access, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { testRoot } from "@grasscn/tests/paths";

async function fixture(run) {
  await mkdir(path.join(testRoot, "test-results", "unit"), { recursive: true });

  const root = await mkdtemp(
    path.join(testRoot, "test-results", "unit/guarded-entry-")
  );

  const gate = path.join(root, "gate.json");
  const marker = path.join(root, "ran.txt");
  const target = path.join(root, "payload.mjs");

  await writeFile(
    target,
    'import {writeFile} from "node:fs/promises"; await writeFile(process.argv[2], "ran")'
  );

  const child = spawn(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve("@grasscn/tests/guarded-entry")),
      gate,
      target,
      marker,
    ],
    { stdio: "ignore" }
  );

  const exited = once(child, "exit");

  try {
    await run({ child, exited, gate, marker });
  } finally {
    if (child.exitCode === null) {
      child.kill();
    }

    await exited;
    await rm(root, { force: true, recursive: true });
  }
}

test("workload waits for enforced budgets before executing", async () =>
  fixture(async ({ child, exited, gate, marker }) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await assert.rejects(access(marker));
    await writeFile(gate, JSON.stringify({ enforced: true, pid: child.pid }));
    assert.equal((await exited)[0], 0);
    await access(marker);
  }));

test("another process's budget gate cannot start the workload", async () =>
  fixture(async ({ child, exited, gate, marker }) => {
    await writeFile(
      gate,
      JSON.stringify({ enforced: true, pid: child.pid + 1 })
    );
    assert.notEqual((await exited)[0], 0);
    await assert.rejects(access(marker));
  }));
