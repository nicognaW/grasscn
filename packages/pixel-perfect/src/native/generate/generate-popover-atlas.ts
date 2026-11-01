import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import type {
  GlyphProbeProvenance,
  GlyphMetrics,
} from "@ppt/native/generate/glyph-atlas";
import { webFile } from "@ppt/paths";

const base = new URL("../../../tests/reference/popover/", import.meta.url);

// SAFETY: retained probe provenance owns this digest contract; the existing
// byte-hash check below remains the authority before using observed glyph data.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Retained glyph-probe provenance format.
const provenance = JSON.parse(
  await readFile(new URL("asset-provenance.json", base), "utf-8")
) as GlyphProbeProvenance;

const bytes = await readFile(new URL("glyph-atlas.json", base));

assert.equal(
  createHash("sha256").update(bytes).digest("hex"),
  provenance.glyphAtlasSha256
);

const source = await readFile(
  new URL("source/ControlsReferenceMain.java", base)
);

assert.equal(
  createHash("sha256").update(source).digest("hex"),
  provenance.glyphProbeSourceSha256
);

// SAFETY: the existing atlas hash, source hash and per-field checks below
// bind the original glyph metrics produced by this native probe.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Native glyph metrics producer contract.
const atlas = JSON.parse(bytes.toString("utf-8")) as Record<
  string,
  GlyphMetrics
>;

const keys = [
  "u0",
  "u1",
  "v0",
  "v1",
  "left",
  "right",
  "up",
  "down",
  "advance",
  "boldOffset",
  "shadowOffset",
] as const;

for (const [code, glyph] of Object.entries(atlas)) {
  assert.match(code, /^[0-9a-f]+$/u);

  for (const key of keys) {
    assert.ok(Number.isFinite(glyph[key]), `${code}: missing ${key}`);
  }

  assert.ok(glyph.u1 > glyph.u0 && glyph.v1 > glyph.v0);
}

await writeFile(
  webFile("registry/ui/minecraft-popover-atlas.ts"),
  `export type PopoverGlyph = {${keys.map((key) => `${key}:number`).join(";")}}\n` +
    "// Original baked glyph geometry and UVs observed in the native Popover cases.\n" +
    `export const popoverGlyphAtlas: Record<string,PopoverGlyph> = ${JSON.stringify(atlas)}\n`
);

console.log(
  `Generated ${Object.keys(atlas).length} original Popover glyph metrics and UVs`
);
