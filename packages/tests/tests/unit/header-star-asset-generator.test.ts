import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { repositoryFile } from "@grasscn/tests/paths";

const generator = repositoryFile(
  "packages/pixel-perfect/src/native/generate/generate-header-star-assets.ts"
);

const run = (files: { index: string; jar: string }) => {
  const root = mkdtempSync(path.join(tmpdir(), "header-star-assets-"));

  try {
    const jar = path.join(root, "26.2.jar");
    const assets = path.join(root, "assets");

    mkdirSync(path.join(assets, "indexes"), { recursive: true });
    writeFileSync(jar, files.jar);
    writeFileSync(path.join(assets, "indexes/32.json"), files.index);

    const result = spawnSync(process.execPath, [generator, jar, assets], {
      encoding: "utf-8",
    });

    return { status: result.status, stderr: result.stderr };
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
};

test("the header star asset generator refuses an unexpected Minecraft JAR", () => {
  const result = run({ index: "{}", jar: "not the 26.2 client" });

  expect(result.status).not.toBe(0);
  // SHA-256 of the fabricated JAR bytes, computed independently with sha256sum.
  expect(result.stderr).toContain(
    "Unexpected Minecraft JAR: sha256 94814407b5fb716c6d461faac58d2cef0320ea572f81dac4fe642e7892105d11"
  );
});

test("the header star asset generator refuses an unexpected asset index", () => {
  const result = run({ index: '{"objects":{}}', jar: "not the 26.2 client" });

  expect(result.status).not.toBe(0);
  // SHA-1 of the fabricated index bytes, computed independently with sha1sum.
  expect(result.stderr).toContain(
    "Unexpected asset index 32: sha1 62ea787c1f800c091b98678b050453a5ae59d7bc"
  );
});
