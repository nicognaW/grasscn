import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  fixtureManifest,
  serveProductionFixture,
} from "@grasscn/tests/fixture";
import { testRoot } from "@grasscn/tests/paths";

const scratchRoot = path.join(testRoot, "test-results", "unit");

fs.mkdirSync(scratchRoot, { recursive: true });

const setup = function setup() {
  const root = fs.mkdtempSync(path.join(scratchRoot, "grasscn-fixture-"));
  const directory = path.join(root, "dist");
  const fallback = path.join(root, "inputs");

  fs.mkdirSync(directory);
  fs.mkdirSync(fallback);
  fs.writeFileSync(path.join(directory, "index.html"), "<div>fixture</div>");
  fs.writeFileSync(
    path.join(directory, "asset.js"),
    "export const fixture=true"
  );
  fs.writeFileSync(path.join(fallback, "dream-skin.png"), "dream texture");
  fs.writeFileSync(path.join(fallback, "steve-skin.png"), "steve texture");
  fs.writeFileSync(path.join(fallback, "private.txt"), "not public");
  fs.writeFileSync(path.join(root, "outside.txt"), "not public");

  return {
    cleanup() {
      assert.ok(root.startsWith(path.join(scratchRoot, "grasscn-fixture-")));
      fs.rmSync(root, { force: true, recursive: true });
    },
    directory,
    fallback,
  };
};

test("production fixture serves bundle assets and skin inputs without exposing other paths", async () => {
  const fixture = setup();
  const host = await serveProductionFixture({ ...fixture, port: 0 });

  try {
    const awaitedUnitRead1 = await fetch(host.url);
    assert.equal(await awaitedUnitRead1.text(), "<div>fixture</div>");
    const script = await fetch(`${host.url}/asset.js`);
    assert.match(script.headers.get("content-type") ?? "", /javascript/u);
    const image = await fetch(`${host.url}/dream-skin.png`);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.equal(await image.text(), "dream texture");

    const readOnlyItems24 = ["private.txt", "..%2Foutside.txt", "missing.html"];

    const readOnlyResults24 = await Promise.allSettled(
      readOnlyItems24.map(async (name) => {
        const awaitedUnitRead2 = await fetch(`${host.url}/${name}`);
        assert.equal(awaitedUnitRead2.status, 404);
      })
    );

    for (const readOnlyResult24 of readOnlyResults24) {
      if (readOnlyResult24.status === "rejected") {
        throw readOnlyResult24.reason;
      }
    }
  } finally {
    await host.close();
    fixture.cleanup();
  }
});

test("production fixture manifest pins every served asset and fallback texture", () => {
  const fixture = setup();

  try {
    const before = fixtureManifest(fixture.directory, fixture.fallback);
    fs.writeFileSync(
      path.join(fixture.directory, "asset.js"),
      "changed bundle"
    );
    const after = fixtureManifest(fixture.directory, fixture.fallback);
    assert.notEqual(before.sha256, after.sha256);
    fs.writeFileSync(
      path.join(fixture.fallback, "steve-skin.png"),
      "changed texture"
    );
    assert.notEqual(
      after.sha256,
      fixtureManifest(fixture.directory, fixture.fallback).sha256
    );
  } finally {
    fixture.cleanup();
  }
});
