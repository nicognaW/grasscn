// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import type {
  GlyphLabelManifest,
  GlyphObservationRepeat,
  SourceProvenance,
} from "@ppt/native/generate/asset-protocol";
import type { GlyphUV } from "@ppt/native/generate/glyph-atlas";
import { webFile } from "@ppt/paths";

const directory = "tests/reference/select-extra";

const readManifest = async (file: string) => {
  // SAFETY: this retained GlyphLabelManifest document is produced by native capture/provenance tooling; existing checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(file, "utf-8")
  ) as GlyphLabelManifest;

  return parsed;
};

const readRepeat = async (file: string) => {
  // SAFETY: this retained GlyphObservationRepeat document is produced by native capture/provenance tooling; existing checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(file, "utf-8")
  ) as GlyphObservationRepeat;

  return parsed;
};

const readSources = async (file: string) => {
  // SAFETY: this retained SourceProvenance document is produced by native capture/provenance tooling; existing checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(await readFile(file, "utf-8")) as SourceProvenance;

  return parsed;
};

const manifest = await readManifest(`${directory}/manifest.json`);
const repeat = await readRepeat(`${directory}/repeatability.json`);

assert.deepEqual(repeat.glyphObservationEnabled, {
  runOne: true,
  runTwo: false,
});

assert.equal(repeat.cases.length, manifest.cases.length);

assert.ok(repeat.cases.every((c) => c.mismatchedPixels === 0));

const bytes = await readFile(`${directory}/glyph-atlas.json`);

// SAFETY: glyph-atlas.json is the native probe's hexadecimal-codepoint UV table.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const observed = JSON.parse(bytes.toString("utf-8")) as Record<string, GlyphUV>;

// Native glyph tables use Unicode code point keys.
const codepoints = new Set(
  manifest.cases.flatMap((sample) => {
    const text = (sample.label ?? "") + (sample.labels ?? []).join("");
    const codes: string[] = [];

    for (const character of text) {
      const code = character.codePointAt(0);

      if (code !== undefined && code >= 128) {
        codes.push(code.toString(16));
      }
    }

    return codes;
  })
);

assert.deepEqual(Object.keys(observed).sort(), [...codepoints].sort());

const atlas = Object.fromEntries(
  Object.entries(observed).map(([code, { u0, u1, v0, v1 }]) => [
    code,
    { u0, u1, v0, v1 },
  ])
);

await writeFile(
  webFile("registry/ui/minecraft-select-atlas.ts"),
  `// Original baked glyph UVs observed after native Select rendering; observer-on and observer-off captures match exactly.\nexport const selectUnihexAtlas = ${JSON.stringify(
    atlas
  )}\n`
);

const assets = await readSources(
  "tests/reference/select/asset-provenance.json"
);

const font = await readSources(
  "tests/reference/input-cjk/asset-provenance.json"
);

await writeFile(
  `${directory}/asset-provenance.json`,
  `${JSON.stringify(
    Object.fromEntries([
      ...Object.entries(assets),
      ["sources", { ...assets.sources, ...font.sources }],
      ["glyphAtlasSha256", createHash("sha256").update(bytes).digest("hex")],
      ["glyphProbeSource", `${directory}/source/ControlsReferenceMain.java`],
      ["glyphProbeSourceSha256", manifest.captureSourceSha256],
      ["glyphObservationVerification", "repeatability.json"],
      [
        "glyphAtlasContext",
        "Original default-font glyphs observed after stable native select frames. Every glyph is rendered in a fitting title before observation. Independent observer-disabled launch has identical decoded RGBA pixels. Popup uses the original language-selection list and entries; dropdown behavior is a web composition.",
      ],
    ]),
    null,
    2
  )}\n`
);

console.log(
  `Generated ${Object.keys(atlas).length} native Select glyph coordinates with non-mutating observation evidence`
);
