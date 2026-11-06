import { test, expect } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  assertExternalProject,
  assertIndependentDependencies,
  consumerEnvironment,
} from "@grasscn/tests/consumer-boundary";

test("external consumer rejects repository descendants and ancestors", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "grasscn-boundary-"));
  await mkdir(path.join(root, "repo", "consumer"), { recursive: true });
  await assert.rejects(
    assertExternalProject(path.join(root, "repo", "consumer"), [
      path.join(root, "repo"),
    ]),
    /outside/u
  );
  await assert.rejects(
    assertExternalProject(root, [path.join(root, "repo")]),
    /outside/u
  );
  await mkdir(path.join(root, "external"));
  expect(
    await assertExternalProject(path.join(root, "external"), [
      path.join(root, "repo"),
    ])
  ).toBe(path.join(root, "external"));
});

test("external consumer rejects inherited dependency fallback", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "grasscn-resolution-"));
  const consumer = path.join(root, "consumer");
  await mkdir(consumer);
  await mkdir(path.join(root, "node_modules", "inherited"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "node_modules", "inherited", "package.json"),
    JSON.stringify({ main: "index.js", name: "inherited" })
  );
  await writeFile(
    path.join(root, "node_modules", "inherited", "index.js"),
    "export default 1"
  );
  await writeFile(
    path.join(consumer, "package.json"),
    JSON.stringify({ dependencies: { inherited: "1" } })
  );
  await assert.rejects(
    assertIndependentDependencies(consumer),
    /own node_modules/u
  );
  expect(consumerEnvironment({ NODE_PATH: root }).NODE_PATH).toBe("");
});
