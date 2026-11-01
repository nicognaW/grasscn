// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectFile, webFile } from "@ppt/paths";

const directory = "tests/reference/tabs-extra";

const read = async (file) =>
  JSON.parse(await readFile(pixelPerfectFile(file), "utf-8"));

const manifest = await read(`${directory}/manifest.json`);
const repeat = await read(`${directory}/repeatability.json`);

assert.deepEqual(repeat.glyphObservationEnabled, {
  runOne: true,
  runTwo: false,
});

assert.equal(repeat.cases.length, manifest.cases.length);

assert.ok(repeat.cases.every((c) => c.mismatchedPixels === 0));

const bytes = await readFile(pixelPerfectFile(`${directory}/glyph-atlas.json`));
const observed = JSON.parse(bytes);

const codepoints = new Set(
  manifest.cases
    .flatMap((c) => [...((c.label ?? "") + (c.labels ?? []).join(""))])
    .map((char) => char.codePointAt(0))
    .filter((code) => code >= 128)
    .map((code) => code.toString(16))
);

assert.deepEqual(Object.keys(observed).toSorted(), [...codepoints].toSorted());

const atlas = Object.fromEntries(
  Object.entries(observed).map(([code, { u0, u1, v0, v1 }]) => [
    code,
    { u0, u1, v0, v1 },
  ])
);

await writeFile(
  webFile("registry/ui/minecraft-tabs-atlas.ts"),
  `// Original baked glyph UVs observed after native Tabs rendering; observer-on and observer-off captures match exactly.\nexport const tabsUnihexAtlas = ${JSON.stringify(
    atlas
  )}\n`
);

const assets = await read("tests/reference/tabs/asset-provenance.json");
const font = await read("tests/reference/input-cjk/asset-provenance.json");

await writeFile(
  pixelPerfectFile(`${directory}/asset-provenance.json`),
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
        "Original default-font glyphs observed after stable native tab frames. Every glyph is rendered in a fitting title before observation. Independent observer-disabled launch has identical decoded RGBA pixels. Panel layout uses original Screen menu texture; supplied content is web composition.",
      ],
    ]),
    null,
    2
  )}\n`
);

console.log(
  `Generated ${Object.keys(atlas).length} native Tabs glyph coordinates with non-mutating observation evidence`
);
