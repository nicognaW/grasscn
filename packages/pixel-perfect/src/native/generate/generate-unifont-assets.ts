// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GlyphUV } from "@ppt/native/generate/glyph-atlas";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { Font, Glyph, Path } from "opentype.js";

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// Remove OpenType's wall-clock timestamps and repair the standard checksums.
const stableFont = function stableFont(buffer: ArrayBuffer) {
  const bytes = Buffer.from(buffer);
  let record = 12;

  while (
    record < 12 + bytes.readUInt16BE(4) * 16 &&
    bytes.toString("ascii", record, record + 4) !== "head"
  ) {
    record += 16;
  }

  if (record >= 12 + bytes.readUInt16BE(4) * 16) {
    throw new Error("Metric font has no head table");
  }

  const offset = bytes.readUInt32BE(record + 8);
  const length = bytes.readUInt32BE(record + 12);

  for (const position of [20, 28]) {
    bytes.writeBigUInt64BE(2_082_844_800n, offset + position);
  }

  bytes.writeUInt32BE(0, offset + 8);

  const sum = (start: number, byteLength: number) => {
    let result = 0;

    for (let i = 0; i < byteLength; i += 4) {
      let word = 0;

      for (let j = 0; j < 4; j += 1) {
        // OpenType checksums pack four original bytes into one unsigned 32-bit word.
        // oxlint-disable-next-line no-bitwise
        word = (word << 8) | (i + j < byteLength ? bytes[start + i + j] : 0);
      }

      // OpenType defines checksum addition modulo 2^32.
      // oxlint-disable-next-line no-bitwise
      result = (result + (word >>> 0)) >>> 0;
    }

    return result;
  };

  bytes.writeUInt32BE(sum(offset, length), record + 4);
  // The OpenType head.checkSumAdjustment is the unsigned modulo-2^32 difference.
  // oxlint-disable-next-line no-bitwise
  bytes.writeUInt32BE((0xb1_b0_af_ba - sum(0, bytes.length)) >>> 0, offset + 8);

  return bytes;
};

const [directory] = process.argv.slice(2);

if (!directory) {
  throw new Error(
    "Pass the extracted indexed Unifont ZIP, HEX, provider definition and provenance directory"
  );
}

const zip = await readFile(path.join(directory, "unifont.zip"));

// SAFETY: the extracted indexed unifont provider owns its native range overrides. Existing ZIP digest verification remains below.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const providers = JSON.parse(
  await readFile(path.join(directory, "unifont.json"), "utf-8")
) as {
  providers: {
    hex_file?: string;
    size_overrides: { from: string; to: string; left: number; right: number }[];
  }[];
};

// SAFETY: the extraction provenance records hashes of the indexed font assets. Existing ZIP digest verification remains below.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const provenance = JSON.parse(
  await readFile(path.join(directory, "provenance.json"), "utf-8")
) as Record<string, { sha256: string; sha1?: string }>;

if (
  createHash("sha256").update(zip).digest("hex") !==
  provenance["minecraft/font/unifont.zip"].sha256
) {
  throw new Error("Indexed Unifont ZIP digest changed");
}

const overrides =
  // SAFETY: The original indexed Unihex JSON contains exactly one provider for minecraft:font/unifont.zip, supplying the existing nine size overrides. Preserve the original lookup and invalid-input dereference behavior.
  /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact original provider/API boundary; no new runtime validation. */
  (
    providers.providers.find(
      (provider) => provider.hex_file === "minecraft:font/unifont.zip"
    ) as (typeof providers)["providers"][number]
  )/* oxlint-enable typescript/no-unsafe-type-assertion */
  .size_overrides
    .map((range) => [
      // SAFETY: The original indexed Unihex provider encodes range endpoints as codepoint strings; all18 endpoints in the independently hash-matched retained provider are nonempty.
      /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact original provider/API boundary; no new runtime validation. */
      range.from.codePointAt(0) as number,
      /* oxlint-enable typescript/no-unsafe-type-assertion */
      // SAFETY: The original indexed Unihex provider encodes range endpoints as codepoint strings; all18 endpoints in the independently hash-matched retained provider are nonempty.
      /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact original provider/API boundary; no new runtime validation. */
      range.to.codePointAt(0) as number,
      /* oxlint-enable typescript/no-unsafe-type-assertion */
      range.left,
      range.right,
    ]);

const isCJK = (code: number) =>
  (code >= 0x11_00 && code <= 0x11_ff) ||
  (code >= 0x2e_80 && code <= 0x9f_ff) ||
  (code >= 0xa9_60 && code <= 0xa9_7f) ||
  (code >= 0xac_00 && code <= 0xd7_ff) ||
  (code >= 0xf9_00 && code <= 0xfa_ff) ||
  (code >= 0xff_01 && code <= 0xff_ef) ||
  (code >= 0x1_af_f0 && code <= 0x1_b2_ff) ||
  (code >= 0x2_00_00 && code <= 0x3_23_af);

const groups = new Map<number, Glyph[]>();
let count = 0;

const hexSource = await readFile(path.join(directory, "unifont.hex"), "utf-8");

for (const line of hexSource.split("\n")) {
  const [raw, hex] = line.trim().split(":");

  if (!hex) {
    continue;
  }

  const code = Number.parseInt(raw, 16);

  if (!isCJK(code)) {
    continue;
  }

  const bitWidth = hex.length / 4;
  const rowLength = hex.length / 16;

  const rows = Array.from({ length: 16 }, (_, row) =>
    Number.parseInt(hex.slice(row * rowLength, (row + 1) * rowLength), 16)
  );

  let left = bitWidth;
  let right = -1;

  for (let x = 0; x < bitWidth; x += 1) {
    // Original Unihex glyph rows pack at most 32 pixels; read one bit without changing signed/unsigned semantics.
    // oxlint-disable-next-line no-bitwise
    if (rows.some((row) => (row >>> (bitWidth - 1 - x)) & 1)) {
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }

  if (right < 0) {
    left = 0;
    right = bitWidth;
  }

  const fixed = overrides.find((range) => code >= range[0] && code <= range[1]);

  if (fixed) {
    [left, right] = fixed.slice(2);
  }

  const plane = Math.floor(code / 65_536);

  let planeGlyphs = groups.get(plane);

  if (planeGlyphs === undefined) {
    planeGlyphs = [];
    groups.set(plane, planeGlyphs);
  }

  planeGlyphs.push(
    new Glyph({
      advanceWidth: ((right - left + 1) / 2 + 1) * 128,
      name: `uni${raw}`,
      path: new Path(),
      unicode: code,
    })
  );
  count += 1;
}

let css =
  "/* Advance-only font for hidden native input text. Visible glyphs use original Unihex pixels. */\n";

for (const [plane, glyphs] of groups) {
  if (glyphs.length >= 65_535) {
    throw new Error("Unihex metric font plane exceeds OpenType glyph limit");
  }

  const font = new Font({
    ascender: 896,
    descender: -128,
    familyName: "Minecraft Unihex Metrics",
    glyphs: [
      new Glyph({
        advanceWidth: 768,
        name: ".notdef",
        path: new Path(),
      }),
      ...glyphs,
    ],
    styleName: "Regular",
    unitsPerEm: 1024,
  });

  css += `@font-face { font-family: "Minecraft Unihex Metrics"; src: url("data:font/otf;base64,${stableFont(font.toArrayBuffer()).toString("base64")}") format("opentype"); font-weight: 400; font-style: normal; font-display: block; unicode-range: U+${(plane * 65_536).toString(16)}-${(plane * 65_536 + 65_535).toString(16)}; }\n`;
}

await writeFile(webFile("registry/ui/minecraft-unifont-metrics.css"), css);

await writeFile(
  webFile("registry/ui/minecraft-unifont-data.ts"),
  `// Unchanged Minecraft indexed GNU Unifont ZIP, including its original license.\nexport const unifontZip = ${JSON.stringify(zip.toString("base64"))}\nexport const unifontOverrides = ${JSON.stringify(overrides)} as const\n`
);

const atlasBytes = await readFile(
  pixelPerfectFile("tests/reference/input-cjk/glyph-atlas.json")
);

// SAFETY: retained GlyphProbeMain output owns the observed glyph UV record.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const atlas = JSON.parse(atlasBytes.toString("utf-8")) as Record<
  string,
  GlyphUV
>;

await writeFile(
  webFile("registry/ui/minecraft-unifont-atlas.ts"),
  `// Observed Minecraft default-font UVs; original glyph pixels remain in the indexed Unihex archive.\nexport const nativeUnihexAtlas: Record<string, {u0:number;u1:number;v0:number;v1:number}> = ${JSON.stringify(Object.fromEntries(Object.entries(atlas).map(([code, glyph]) => [code, { u0: glyph.u0, u1: glyph.u1, v0: glyph.v0, v1: glyph.v1 }])))}\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/input-cjk/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["assetIndex", "32"],
      ["locale", "en_us / Japanese glyph filter disabled"],
      ["sources", provenance],
      ["glyphCount", count],
      ["glyphAtlasSha256", hash(atlasBytes)],
      [
        "glyphProbeSourceSha256",
        hash(
          await readFile(
            pixelPerfectFile("tests/reference/GlyphProbeMain.java")
          )
        ),
      ],
      [
        "rendering",
        "Original indexed Unihex pixels and size overrides; oversample2, shadow offset0.5, native 0.01-texel inset and observed default-font UVs for the tested glyphs. GPU projection uses the actual input screen position and viewport. Advance-only font preserves native DOM hit-testing. Other CJK glyphs retain original pixels but their atlas sampling is unverified.",
      ],
    ]),
    null,
    2
  )}\n`
);

console.log(
  `Prepared ${count} CJK glyph metrics in ${groups.size} Unicode planes; original font ZIP preserved`
);
