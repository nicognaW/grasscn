import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  productionBuildIdentity,
  assertProductionSource,
  stampProductionBuild,
  readPreparedProductionBuild,
} from "@grasscn/tests/next-production";

test("prepared production requires a completed matching build instead of silently accepting existing output", async () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "grasscn-prepared-build-")
  );

  const directory = path.join(root, "web");
  const receiptPath = path.join(root, "completed.json");

  const source = {
    commit: "completed-source",
    status: "",
    treeSha256: "completed-tree",
  };

  try {
    for (const name of [
      "web/.next/server",
      "web/.next/types",
      "web/.source",
      "web/public/r",
      "node_modules/tool",
    ]) {
      fs.mkdirSync(path.join(root, name), { recursive: true });
    }
    fs.writeFileSync(path.join(root, "bun.lock"), '{"workspaces":{}}');
    fs.writeFileSync(
      path.join(root, "node_modules/tool/index.js"),
      "installed tool bytes"
    );
    fs.writeFileSync(
      path.join(directory, ".next/BUILD_ID"),
      "known-completed-build"
    );
    fs.writeFileSync(
      path.join(directory, ".next/server/page.js"),
      "built page"
    );
    fs.writeFileSync(
      path.join(directory, ".next/types/routes.d.ts"),
      "generated route types"
    );
    fs.writeFileSync(
      path.join(directory, ".source/server.ts"),
      "generated MDX source"
    );
    fs.writeFileSync(
      path.join(directory, "next-env.d.ts"),
      "generated Next environment"
    );
    fs.writeFileSync(
      path.join(directory, "public/r/button.json"),
      "delivered registry"
    );
    const options = { directory, receiptPath, root, source };
    await assert.rejects(
      async () => await readPreparedProductionBuild(options),
      /ENOENT/
    );
    await stampProductionBuild(options);
    await assert.rejects(
      async () => await readPreparedProductionBuild(options),
      /completed build/i
    );
    await assert.rejects(
      async () =>
        await stampProductionBuild({
          ...options,
          verifiedCommand: [process.execPath, "run", "build"],
          verifiedExitCode: 9,
        }),
      /completed|exit/i
    );
    await assert.rejects(
      async () =>
        await stampProductionBuild({
          ...options,
          verifiedCommand: [process.execPath, "run", "build", "--dry=json"],
          verifiedExitCode: 0,
        }),
      /root build|command/i
    );
    await stampProductionBuild({
      ...options,
      verifiedCommand: [process.execPath, "run", "build"],
      verifiedExitCode: 0,
    });
    const prepared = await readPreparedProductionBuild(options);
    assert.equal(prepared.buildId, "known-completed-build");
    assert.deepEqual(prepared.verifiedCommand, [
      process.execPath,
      "run",
      "build",
    ]);
    const bunOptionsBefore = process.env.BUN_OPTIONS;

    try {
      process.env.BUN_OPTIONS = "--smol";
      await assert.rejects(
        async () => await readPreparedProductionBuild(options),
        /environment changed/i
      );
    } finally {
      if (bunOptionsBefore === undefined) {
        delete process.env.BUN_OPTIONS;
      } else {
        process.env.BUN_OPTIONS = bunOptionsBefore;
      }
    }

    await assert.rejects(
      async () =>
        await readPreparedProductionBuild({
          ...options,
          source: { ...source, treeSha256: "another-tree" },
        }),
      /source/i
    );

    for (const filename of [
      path.join(root, "node_modules/tool/index.js"),
      path.join(directory, ".source/server.ts"),
      path.join(directory, "next-env.d.ts"),
      path.join(directory, ".next/types/routes.d.ts"),
      path.join(directory, "public/r/button.json"),
      path.join(directory, ".next/server/page.js"),
    ]) {
      const original = fs.readFileSync(filename);
      fs.writeFileSync(filename, "changed bytes");
      await assert.rejects(
        async () => await readPreparedProductionBuild(options),
        /changed/i
      );
      fs.writeFileSync(filename, original);
    }

    const originalReceipt = fs.readFileSync(receiptPath, "utf-8");
    const differentEnvironment = JSON.parse(originalReceipt);
    differentEnvironment.preparation.environment.bun = "different-runtime";
    fs.writeFileSync(receiptPath, JSON.stringify(differentEnvironment));
    await assert.rejects(
      async () => await readPreparedProductionBuild(options),
      /environment changed/i
    );
    fs.writeFileSync(receiptPath, originalReceipt);
    assert.equal(
      (await readPreparedProductionBuild(options)).buildId,
      "known-completed-build"
    );
  } finally {
    assert.ok(path.basename(root).startsWith("grasscn-prepared-build-"));
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("production identity rejects another source and detects changed delivered registry bytes", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "grasscn-next-identity-")
  );

  try {
    fs.mkdirSync(path.join(directory, ".next/server"), { recursive: true });
    fs.mkdirSync(path.join(directory, "public/r"), { recursive: true });
    fs.writeFileSync(
      path.join(directory, ".next/BUILD_ID"),
      "known-production"
    );
    fs.writeFileSync(
      path.join(directory, ".next/server/page.js"),
      "original built page"
    );
    fs.writeFileSync(
      path.join(directory, "public/r/button.json"),
      "original delivered registry"
    );
    const source = { commit: "snapshot-one", treeSha256: "source-one" };
    const identity = await productionBuildIdentity({ directory, source });
    assert.equal(identity.buildId, "known-production");
    assert.throws(() => {
      assertProductionSource(identity, {
        ...source,
        treeSha256: "source-two",
      });
    }, /source/i);
    fs.writeFileSync(
      path.join(directory, "public/r/button.json"),
      "changed delivered registry"
    );

    const changedRegistry = await productionBuildIdentity({
      directory,
      source,
    });

    assert.notEqual(identity.outputSha256, changedRegistry.outputSha256);
    fs.writeFileSync(
      path.join(directory, ".next/server/page.js"),
      "changed built page"
    );
    assert.notEqual(
      changedRegistry.outputSha256,
      (await productionBuildIdentity({ directory, source })).outputSha256
    );
  } finally {
    assert.ok(path.basename(directory).startsWith("grasscn-next-identity-"));
    fs.rmSync(directory, { force: true, recursive: true });
  }
});
