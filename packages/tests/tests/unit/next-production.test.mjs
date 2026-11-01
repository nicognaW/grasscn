import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  productionBuildIdentity,
  assertProductionSource,
} from "@grasscn/tests/next-production";

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
    assert.throws(
      () =>
        assertProductionSource(identity, {
          ...source,
          treeSha256: "source-two",
        }),
      /source/i
    );
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
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
