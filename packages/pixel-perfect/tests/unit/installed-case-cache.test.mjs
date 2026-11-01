import { test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  installedCaseCache,
  installedConsumerIdentity,
} from "@ppt/installed/case-cache.mjs";
import { pixelPerfectTestRoot } from "@ppt/paths";
import { PNG } from "pngjs";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

const scratchRoot = path.join(pixelPerfectTestRoot, "unit");

fs.mkdirSync(scratchRoot, { recursive: true });

test("installed case checkpoints require all aliases, exact pixels and matching source identity", () => {
  const directory = fs.mkdtempSync(
    path.join(scratchRoot, "grasscn-case-cache-")
  );

  try {
    const png = new PNG({ height: 2, width: 2 });
    png.data.fill(255);

    const bytes = PNG.sync.write(png);
    const rgba = digest(png.data);

    const record = {
      decodedRgbaSha256: rgba,
      mismatchedPixels: 0,
      name: "case",
      selectedDecodedRgbaSha256: rgba,
    };

    const identity = { browser: "edge", source: "one" };
    const cache = installedCaseCache(directory, identity);

    cache.write("case", bytes, record, {
      decodedRgbaSha256: bytes,
      selectedDecodedRgbaSha256: bytes,
    });
    assert.deepEqual(
      cache.read(
        "case",
        bytes,
        Object.keys(record).filter((k) => k.endsWith("Sha256"))
      ),
      record
    );
    assert.equal(cache.read("case", bytes, ["decodedRgbaSha256"]), null);
    assert.equal(
      installedCaseCache(directory, { ...identity, source: "two" }).read(
        "case",
        bytes,
        ["decodedRgbaSha256", "selectedDecodedRgbaSha256"]
      ),
      null
    );
    png.data[0] ^= 1;
    const changed = PNG.sync.write(png);
    assert.equal(
      cache.read("case", changed, [
        "decodedRgbaSha256",
        "selectedDecodedRgbaSha256",
      ]),
      null
    );
    assert.throws(() =>
      cache.write("case", bytes, record, { decodedRgbaSha256: changed })
    );

    const folder = path.join(
      directory,
      fs.readdirSync(directory)[0],
      digest("case")
    );

    fs.writeFileSync(
      path.join(folder, `${digest("decodedRgbaSha256")}.png`),
      changed
    );
    assert.equal(
      cache.read("case", bytes, [
        "decodedRgbaSha256",
        "selectedDecodedRgbaSha256",
      ]),
      null
    );
  } finally {
    assert.ok(
      directory.startsWith(path.join(scratchRoot, "grasscn-case-cache-"))
    );
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test("consumer identity changes with fixture and installed dependency inputs", () => {
  const directory = fs.mkdtempSync(
    path.join(scratchRoot, "grasscn-case-cache-")
  );

  try {
    fs.mkdirSync(path.join(directory, "src"));
    fs.writeFileSync(path.join(directory, "src", "fixture.tsx"), "first");
    const before = installedConsumerIdentity(directory);
    fs.writeFileSync(path.join(directory, "src", "fixture.tsx"), "second");
    const after = installedConsumerIdentity(directory);
    assert.notEqual(before, after);
    fs.writeFileSync(
      path.join(directory, "bun.lock"),
      JSON.stringify({ workspaces: { "apps/web": { name: "web" } } })
    );
    const dependency = installedConsumerIdentity(directory);
    assert.notEqual(after, dependency);
    fs.writeFileSync(
      path.join(directory, "dynamic.html"),
      "<style>body{background:red}</style>"
    );
    const entrypoint = installedConsumerIdentity(directory);
    assert.notEqual(dependency, entrypoint);
    fs.mkdirSync(path.join(directory, "public"));
    fs.writeFileSync(path.join(directory, "public", "sprite.png"), "new asset");
    assert.notEqual(entrypoint, installedConsumerIdentity(directory));
    fs.mkdirSync(path.join(directory, "node_modules"));
    const local = path.join(directory, "apps/web/node_modules/example");
    fs.mkdirSync(local, { recursive: true });
    fs.writeFileSync(path.join(local, "index.js"), "first installed bytes");
    const installed = installedConsumerIdentity(directory);
    fs.writeFileSync(path.join(local, "index.js"), "changed installed bytes");
    assert.notEqual(installed, installedConsumerIdentity(directory));
  } finally {
    assert.ok(
      directory.startsWith(path.join(scratchRoot, "grasscn-case-cache-"))
    );
    fs.rmSync(directory, { force: true, recursive: true });
  }
});
