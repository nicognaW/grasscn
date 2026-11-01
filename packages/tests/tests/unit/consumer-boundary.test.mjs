import { test, expect } from "bun:test";
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
  await expect(
    assertExternalProject(path.join(root, "repo", "consumer"), [
      path.join(root, "repo"),
    ])
  ).rejects.toThrow("outside");
  await expect(
    assertExternalProject(root, [path.join(root, "repo")])
  ).rejects.toThrow("outside");
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
    JSON.stringify({ name: "inherited", main: "index.js" })
  );
  await writeFile(
    path.join(root, "node_modules", "inherited", "index.js"),
    "export default 1"
  );
  await writeFile(
    path.join(consumer, "package.json"),
    JSON.stringify({ dependencies: { inherited: "1" } })
  );
  await expect(assertIndependentDependencies(consumer)).rejects.toThrow(
    "own node_modules"
  );
  expect(consumerEnvironment({ NODE_PATH: root }).NODE_PATH).toBe("");
});
