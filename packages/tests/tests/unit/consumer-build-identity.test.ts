import { test, expect } from "bun:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { directoryIdentity } from "@grasscn/tests/consumer-boundary";

import { consumerBuildIdentity } from "../../src/installed/consumer-build-identity";

test("consumer build identity excludes only Next's response-cache path and preserves immutable delivery", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "grasscn-consumer-build-"));
  const build = path.join(root, ".next");

  const immutable = [
    "server/app/docs/button.html",
    "server/chunks/runtime.js",
    "server/app/route-cache/delivered.rsc",
    "static/route-cache/runtime.js",
  ];

  const response = path.join(
    build,
    "server/route-cache/APP_PAGE/owner/$/button.rsc"
  );

  const asset = path.join(root, "public/r/button.json");

  try {
    for (const file of immutable) {
      mkdirSync(path.dirname(path.join(build, file)), { recursive: true });
      writeFileSync(path.join(build, file), `original ${file}`);
    }

    await mkdir(path.dirname(asset), { recursive: true });
    await writeFile(asset, "original registry delivery");
    const baseline = await consumerBuildIdentity(build, "next");
    const inputs = await directoryIdentity(root);
    await mkdir(path.dirname(response), { recursive: true });
    await writeFile(response, "runtime response");
    expect(await consumerBuildIdentity(build, "next")).toEqual(baseline);
    await writeFile(response, "updated runtime response");
    expect(await consumerBuildIdentity(build, "next")).toEqual(baseline);

    for (const file of immutable) {
      writeFileSync(path.join(build, file), "changed compiled delivery");
      // oxlint-disable-next-line no-await-in-loop -- Mutates one shared build tree, checks that exact immutable-output change, then restores it before the next mutation.
      expect(await consumerBuildIdentity(build, "next")).not.toEqual(baseline);
      writeFileSync(path.join(build, file), `original ${file}`);
    }

    await writeFile(asset, "changed registry delivery");
    expect(await directoryIdentity(root)).not.toEqual(inputs);
    const vite = await consumerBuildIdentity(build, "vite");
    await writeFile(response, "changed Vite immutable file");
    expect(await consumerBuildIdentity(build, "vite")).not.toEqual(vite);
  } finally {
    assert.ok(path.basename(root).startsWith("grasscn-consumer-build-"));
    await rm(root, { force: true, recursive: true });
  }
});
