import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import { repoRoot } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import type {
  NativeTraceIdentity,
  TradingTraceRepeat,
  TradingTraceEvents,
  TerrainProvenance,
  NativeMapGeneration,
  NativeMapRepeat,
  SkinProvenance,
  FrozenTerrainInput,
  SkinPin,
} from "@ppt/runtime/porting-evidence-types";

const isSkinPin = (record: SkinPin | string): record is SkinPin =>
  typeof record !== "string";

const digest = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");

export const verifyPortingEvidence = async function verifyPortingEvidence(
  root: string
) {
  const bytes = async (name: string) =>
    await readFile(evidenceFile(name, root));

  const readTradingManifest = async (name: string) => {
    const source = await bytes(name);

    // SAFETY: the retained NativeTraceIdentity producer owns this document; integrity checks remain below.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const parsed = JSON.parse(source.toString("utf-8")) as NativeTraceIdentity;

    return parsed;
  };

  const readTradingRepeat = async (name: string) => {
    const source = await bytes(name);

    // SAFETY: the retained TradingTraceRepeat producer owns this document; integrity checks remain below.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const parsed = JSON.parse(source.toString("utf-8")) as TradingTraceRepeat;

    return parsed;
  };

  const readTradingEvents = async (name: string) => {
    const source = await bytes(name);

    // SAFETY: the retained TradingTraceEvents producer owns this document; integrity checks remain below.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const parsed = JSON.parse(source.toString("utf-8")) as TradingTraceEvents;

    return parsed;
  };

  const readTerrainProvenance = async (name: string) => {
    const source = await bytes(name);

    // SAFETY: the retained TerrainProvenance producer owns this document; integrity checks remain below.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const parsed = JSON.parse(source.toString("utf-8")) as TerrainProvenance;

    return parsed;
  };

  const readMapGeneration = async (name: string) => {
    const source = await bytes(name);

    // SAFETY: the retained NativeMapGeneration producer owns this document; integrity checks remain below.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const parsed = JSON.parse(source.toString("utf-8")) as NativeMapGeneration;

    return parsed;
  };

  const readMapRepeat = async (name: string) => {
    const source = await bytes(name);

    // SAFETY: the retained NativeMapRepeat producer owns this document; integrity checks remain below.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const parsed = JSON.parse(source.toString("utf-8")) as NativeMapRepeat;

    return parsed;
  };

  const readSkinProvenance = async (name: string) => {
    const source = await bytes(name);

    // SAFETY: the retained SkinProvenance producer owns this document; integrity checks remain below.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const parsed = JSON.parse(source.toString("utf-8")) as SkinProvenance;

    return parsed;
  };

  const trading = "tests/reference/trading/scrollbar/";

  const manifest = await readTradingManifest(`${trading}manifest.json`);

  const repeat = await readTradingRepeat(
    `${trading}interaction-repeatability.json`
  );

  for (const key of [
    "sourceJarSha256",
    "captureSourceSha256",
    "caseDefinitionSha256",
  ] as const) {
    assert.equal(repeat[key], manifest[key], `Trading trace identity: ${key}`);
  }

  assert.equal(repeat.identical, true, "Trading native trace repeat must pass");

  const events = await readTradingEvents(
    `${trading}trading-scroll-events.json`
  );

  assert.deepEqual(
    Object.keys(events)
      .map(Number)
      .sort((a, b) => a - b),
    repeat.offerCounts
  );
  assert.equal(
    Object.values(events).reduce((n, cases) => n + cases.length, 0),
    repeat.count
  );

  for (const [count, cases] of Object.entries(events)) {
    assert.ok(cases.length > 0);

    for (const sample of cases) {
      assert.ok(["wheel", "press", "drag"].includes(sample.kind));
      assert.ok(
        Number.isInteger(sample.result) &&
          sample.result >= 0 &&
          sample.result <= Math.max(0, Number(count) - 7)
      );
    }
  }

  const map = "tests/reference/map/demo-world/";

  const provenance = await readTerrainProvenance(
    `${map}terrain-provenance.json`
  );

  const generation = await readMapGeneration(`${map}map-world-generation.json`);

  const repeated = await readMapRepeat(`${map}generation-repeatability.json`);

  const inputBytes = await bytes(`${map}inputs/map-world-input.json.gz`);
  assert.equal(
    digest(inputBytes),
    provenance.inputSha256,
    "Frozen terrain input hash"
  );
  assert.equal(inputBytes.length, provenance.inputBytes);

  // SAFETY: the frozen native terrain input contains a chunk array and source-region identity.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const input = JSON.parse(
    gunzipSync(inputBytes).toString("utf-8")
  ) as FrozenTerrainInput;

  assert.equal(input.chunks.length, provenance.chunks);
  assert.equal(input.sourceRegionSha256, provenance.sourceRegionSha256);
  assert.equal(provenance.originalRegionUnchanged, true);
  assert.equal(
    provenance.sourceRegionAfterGenerationSha256,
    provenance.sourceRegionSha256
  );
  assert.deepEqual(repeated.generationRunOne, generation);
  assert.deepEqual(repeated.generationRunTwo, generation);
  assert.equal(generation.inputSha256, provenance.inputSha256);
  assert.equal(generation.sourceRegionSha256, provenance.sourceRegionSha256);
  assert.equal(generation.unsupportedRequests, 0);
  assert.equal(generation.unexploredPixels, 0);
  assert.deepEqual([generation.centerX, generation.centerZ], provenance.center);
  assert.equal(generation.mapScale, provenance.mapScale);

  const palette = await bytes(`${map}map-world.colors`);
  assert.equal(palette.length, 16_384);
  assert.equal(repeated.colorsBytes, palette.length);
  assert.equal(repeated.mismatchedPaletteBytes, 0);

  for (const hash of [
    generation.colorsSha256,
    repeated.colorsSha256,
    provenance.previewPaletteSha256,
  ]) {
    assert.equal(digest(palette), hash, "Generated map palette hash");
  }

  const demoBytes = await bytes("preview/demos/map-world-data.ts");

  const demo = demoBytes.toString("utf-8");

  const embedded =
    /export const worldMapPaletteBase64\s*=\s*"(?<palette>[A-Za-z0-9+/=]+)"/u.exec(
      demo
    );

  assert.ok(embedded, "Map demo must embed the verified native palette");
  assert.deepEqual(
    Buffer.from(embedded[1], "base64"),
    palette,
    "Demo palette differs from native generation"
  );

  const skins = await readSkinProvenance(
    "tests/reference/player-preview/custom-skins/skin-provenance.json"
  );

  for (const [name, record] of Object.entries(skins)) {
    if (!isSkinPin(record) || !record.sha256) {
      continue;
    }

    assert.equal(
      digest(await bytes(`tests/fixture/${name}-skin.png`)),
      record.sha256,
      `Frozen ${name} skin`
    );
  }

  return {
    mapPaletteBytes: palette.length,
    nativeTraceEvents: repeat.count,
    scope: "Committed evidence integrity; no fresh native launch",
  };
};

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  console.log(await verifyPortingEvidence(path.resolve(repoRoot)));
}
