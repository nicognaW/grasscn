// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
// Input: unchanged PNGs and font/include/default.json extracted from the supplied game JAR.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SpriteMetadata } from "@ppt/native/generate/asset-protocol";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { Font, Glyph, Path } from "opentype.js";
import { PNG } from "pngjs";

const [input] = process.argv.slice(2);

if (!input) {
  throw new Error(
    "Usage: bun src/native/generate/generate-assets.ts <extracted-asset-directory>"
  );
}

const atlasBytes = await readFile(path.join(input, "ascii.png"));
const atlas = PNG.sync.read(atlasBytes);

// SAFETY: extracted font/include/default.json owns the bitmap provider records consumed below.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const definitions = JSON.parse(
  await readFile(path.join(input, "default.json"), "utf-8")
) as { providers: { file?: string; ascent: number; chars: string[] }[] };

const provider = definitions.providers.find(
  (p) => p.file === "minecraft:font/ascii.png"
)!;

const cell = atlas.width / 16;
const glyphs: [number, number, number][] = [];
const unit = 128;

const outlineGlyphs = [
  new Glyph({
    advanceWidth: 6 * unit,
    name: ".notdef",
    path: new Path(),
  }),
];

for (let code = 32; code <= 126; code += 1) {
  const char = String.fromCodePoint(code);
  const row = provider.chars.findIndex((line) => line.includes(char));
  const column = provider.chars[row].indexOf(char);

  const ink = (x: number, y: number) =>
    atlas.data[((row * cell + y) * atlas.width + column * cell + x) * 4 + 3] !==
    0;

  const outline = new Path();
  let rightmost = -1;

  for (let y = 0; y < cell; y += 1) {
    for (let x = 0; x < cell; x += 1) {
      if (!ink(x, y)) {
        continue;
      }

      const start = x;

      while (x + 1 < cell && ink(x + 1, y)) {
        x += 1;
      }

      rightmost = Math.max(rightmost, x);
      outline.moveTo(start * unit, (provider.ascent - y) * unit);
      outline.lineTo((x + 1) * unit, (provider.ascent - y) * unit);
      outline.lineTo((x + 1) * unit, (provider.ascent - y - 1) * unit);
      outline.lineTo(start * unit, (provider.ascent - y - 1) * unit);
      outline.close();
    }
  }

  const glyphMetrics: (typeof glyphs)[number] = [
    column * cell,
    row * cell,
    code === 32 ? 4 : rightmost + 2,
  ];

  glyphs.push(glyphMetrics);
  outlineGlyphs.push(
    new Glyph({
      advanceWidth: glyphMetrics[2] * unit,
      name: `uni${code.toString(16).padStart(4, "0")}`,
      path: outline,
      unicode: code,
    })
  );
}

await writeFile(
  webFile("registry/ui/minecraft-font.ts"),
  `// Original ASCII bitmap glyph [x, y, advance] metrics, code points 32..126.\nexport const minecraftGlyphs = ${JSON.stringify(glyphs)} as const\n`
);

interface BitmapSourceHashes {
  "ascii.png": string;
  [filename: string]: string;
}

const sources: BitmapSourceHashes = {
  "ascii.png": createHash("sha256").update(atlasBytes).digest("hex"),
};

let css = `/* Generated from Minecraft assets. Original artwork remains Mojang's; local pilot only. */\n`;

// Class-only buttonVariants() consumers cannot insert bitmap spans. Supply the same
// glyph shapes as a web font; <Button> uses bitmap masks for verified exact pixels.
const font = new Font({
  ascender: 7 * unit,
  descender: -unit,
  familyName: "Minecraft Bitmap",
  glyphs: outlineGlyphs,
  styleName: "Regular",
  unitsPerEm: 8 * unit,
});

css += `@font-face { font-family: "Minecraft Bitmap"; src: url("data:font/otf;base64,${Buffer.from(font.toArrayBuffer()).toString("base64")}") format("opentype"); font-weight: 400; font-style: normal; font-display: block; unicode-range: U+0020-007E; }\n`;

css += `.mc-button { --mc-ascii-atlas: url("data:image/png;base64,${atlasBytes.toString("base64")}"); --mc-atlas-size: ${atlas.width}; }\n`;

for (const [state, filename] of [
  ["normal", "button.png"],
  ["highlighted", "button_highlighted.png"],
  ["disabled", "button_disabled.png"],
]) {
  const bytes = await readFile(path.join(input, filename));
  const sprite = PNG.sync.read(bytes);

  if (sprite.width !== 200 || sprite.height !== 20) {
    throw new Error("Expected the pinned 200x20 sprite");
  }

  sources[filename] = createHash("sha256").update(bytes).digest("hex");
  const metadata = await readFile(path.join(input, `${filename}.mcmeta`));
  sources[`${filename}.mcmeta`] = createHash("sha256")
    .update(metadata)
    .digest("hex");

  // SAFETY: original widget mcmeta supplies a uniform numeric border in the pinned Button sprite inputs.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const metadataDocument = JSON.parse(
    metadata.toString("utf-8")
  ) as SpriteMetadata & { gui: { scaling: { border: number } } };

  const b = metadataDocument.gui.scaling.border;

  const w = 200 - b * 2;
  const h = 20 - b * 2;

  const pieces = [
    [0, 0, b, b],
    [b, 0, w, b],
    [200 - b, 0, b, b],
    [0, b, b, h],
    [b, b, w, h],
    [200 - b, b, b, h],
    [0, 20 - b, b, b],
    [b, 20 - b, w, b],
    [200 - b, 20 - b, b, b],
  ];

  css += `.mc-button { --mc-${state}-image: url("data:image/png;base64,${bytes.toString("base64")}"); --mc-${state}-border: ${b}; ${pieces
    .map(([x, y, width, height], i) => {
      const tile = new PNG({ height, width });
      PNG.bitblt(sprite, tile, x, y, width, height, 0, 0);

      return `--mc-${state}-${i}: url("data:image/png;base64,${PNG.sync.write(tile).toString("base64")}");`;
    })
    .join(" ")} }\n`;
}

await writeFile(webFile("registry/ui/minecraft-assets.css"), css);

await writeFile(
  pixelPerfectFile("tests/reference/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["minecraftVersion", "26.2"],
      ["sourceFiles", sources],
      [
        "font",
        "Unchanged original ASCII bitmap atlas; original advances preserved, space advance 4 from Minecraft space provider",
      ],
      [
        "sourceJarSha256",
        "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290",
      ],
    ]),
    null,
    2
  )}\n`
);

console.log(
  "Generated embedded textures and original ASCII bitmap glyph metrics"
);
