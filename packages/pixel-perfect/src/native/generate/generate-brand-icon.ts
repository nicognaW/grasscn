// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import path from "node:path";

import { minecraftCardSprite } from "@grasscn/web/ui/minecraft-card-sprite";
import { minecraftGlyphs } from "@grasscn/web/ui/minecraft-font";
import { minecraftInputAssets } from "@grasscn/web/ui/minecraft-input-assets";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type modelAssets from "../../../tests/reference/branding/model-assets.json";
import type popupAssets from "../../../tests/reference/card/asset-provenance.json";

const [first, second] = process.argv.slice(2);

if (!first || !second) {
  throw new Error(
    "Pass two independently captured native grass-item output directories"
  );
}

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const oneBytes = await readFile(path.join(first, "capture.json"));

// SAFETY: capture-brand-icon emits these scale records; the paired identity/pixel checks below remain unchanged.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const one = JSON.parse(oneBytes.toString("utf-8")) as { scales: number[] };

const twoBytes = await readFile(path.join(second, "capture.json"));

// SAFETY: capture-brand-icon emits these scale records; the paired identity/pixel checks below remain unchanged.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const two = JSON.parse(twoBytes.toString("utf-8")) as { scales: number[] };

assert.deepEqual(one, two, "Native item capture identities differ");

const assets = webFile("assets");
const references = pixelPerfectFile("tests/reference/branding");

await Promise.all([
  mkdir(assets, { recursive: true }),
  mkdir(references, { recursive: true }),
]);

const cases = [];

const generated: Record<
  string,
  {
    width: number;
    height: number;
    sha256: string;
    opaquePixels?: number;
    alphaRecovery?: string;
    text?: string;
    composition?: string;
  }
> = {};

const nativeCaseReadJobs = [];

for (const scale of one.scales) {
  for (const background of ["black", "white"]) {
    nativeCaseReadJobs.push(
      (async () => {
        const filename = `grass-block-${background}-s${scale}.png`;

        const [firstRead, secondRead] = await Promise.allSettled(
          [
            async () => await readFile(path.join(first, filename)),
            async () => await readFile(path.join(second, filename)),
          ].map(async (read) => await read())
        );

        if (firstRead.status === "rejected") {
          throw firstRead.reason;
        }

        if (secondRead.status === "rejected") {
          throw secondRead.reason;
        }

        return { a: firstRead.value, b: secondRead.value };
      })()
    );
  }
}

const nativeCaseReads = await Promise.allSettled(nativeCaseReadJobs);

for (const [scaleIndex, scale] of one.scales.entries()) {
  const images = [];

  for (const [backgroundIndex, background] of ["black", "white"].entries()) {
    const filename = `grass-block-${background}-s${scale}.png`;

    const caseRead = nativeCaseReads[scaleIndex * 2 + backgroundIndex];

    if (caseRead.status === "rejected") {
      throw caseRead.reason;
    }

    const { a, b } = caseRead.value;

    const p = PNG.sync.read(a);
    const q = PNG.sync.read(b);

    assert.deepEqual([p.width, p.height], [16 * scale, 16 * scale]);
    assert.ok(p.data.equals(q.data), `Non-repeatable native item: ${filename}`);
    images.push(p);
    cases.push(
      Object.fromEntries([
        ["filename", filename],
        ["scale", scale],
        ["background", background],
        ["firstPngSha256", hash(a)],
        ["secondPngSha256", hash(b)],
        ["decodedRgbaSha256", hash(p.data)],
        ["mismatchedPixels", 0],
      ])
    );
  }

  const [black, white] = images;
  const result = new PNG({ height: black.height, width: black.width });

  let opaque = 0;

  for (let i = 0; i < black.data.length; i += 4) {
    const delta = [0, 1, 2].map(
      (channel) => white.data[i + channel] - black.data[i + channel]
    );

    // Original grass-block geometry and textures are opaque; its untouched GUI
    // background is the only transparent region. No chroma-key colors are guessed.
    assert.ok(
      delta.every((value) => value === 0) ||
        delta.every((value) => value === 255),
      "Native item has partial alpha; paired recovery needs a wider precision model"
    );
    const alpha = delta[0] === 255 ? 0 : 255;
    result.data.set(
      alpha ? [...black.data.subarray(i, i + 3), 255] : [0, 0, 0, 0],
      i
    );

    if (alpha) {
      opaque += 1;
    }
  }

  assert.ok(
    opaque > 50 && opaque < result.width * result.height,
    "Grass item silhouette is missing"
  );

  const bytes = PNG.sync.write(result);
  const filename = `grass-block-${16 * scale}.png`;

  // oxlint-disable-next-line eslint/no-await-in-loop -- Preserve the original retained-output write order and first-failure/partial-output boundary before publishing the next artifact.
  await writeFile(path.join(assets, filename), bytes);
  // oxlint-disable-next-line eslint/sort-keys -- Retain the existing serialized field order and contextual required-key checks; a dynamic entries record loses this producer shape.
  generated[filename] = {
    width: result.width,
    height: result.height,
    sha256: hash(bytes),
    opaquePixels: opaque,
    alphaRecovery:
      "Exact per-pixel black/white contrast identifies binary coverage; original item RGB copied without recoloring or resizing",
  };
}

const blockBytes = await readFile(path.join(assets, "grass-block-48.png"));
const block = `data:image/png;base64,${blockBytes.toString("base64")}`;
const { atlas } = minecraftInputAssets;

const defs = [];
const badgeRects = [];

const border = minecraftCardSprite.border.left;

const widths = [border, minecraftCardSprite.width - border * 2, border];
const heights = [border, minecraftCardSprite.height - border * 2, border];

const destinationWidths = [border, 120 - border * 2, border];
const destinationHeights = [border, 40 - border * 2, border];

for (let row = 0, y = 12; row < 3; row += 1) {
  for (let col = 0, x = 56; col < 3; col += 1) {
    const index = row * 3 + col;
    const source = minecraftCardSprite.pieces[index].slice(5, -2);

    defs.push(
      `<pattern id="panel${index}" x="${x}" y="${y}" width="${widths[col]}" height="${heights[row]}" patternUnits="userSpaceOnUse"><image href="${source}" width="${widths[col]}" height="${heights[row]}"/></pattern>`
    );
    badgeRects.push(
      `<rect x="${x}" y="${y}" width="${destinationWidths[col]}" height="${destinationHeights[row]}" fill="url(#panel${index})"/>`
    );

    x += destinationWidths[col];
  }

  y += destinationHeights[row];
}

let x = 68;

const wordmark = "grass cn";

for (let index = 0; index < wordmark.length; index += 1) {
  const char = wordmark[index];

  const [gx, gy, advance] =
    minecraftGlyphs[
      // SAFETY: The bounded ASCII wordmark index selects one existing character, so String.codePointAt(0) is numeric.
      /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact nonempty String-iterator API contract; no additional runtime guard. */
      (char.codePointAt(0) as number) -
        /* oxlint-enable typescript/no-unsafe-type-assertion */
        32
    ];

  const color = index > 5 ? "#55ff55" : "#ffffff";
  const shadow = index > 5 ? "#153f15" : "#3f3f3f";

  if (char !== " ") {
    for (const [pass, offset, ink] of [
      ["shadow", 2, shadow],
      ["ink", 0, color],
    ] as const) {
      const left = x + offset;
      const top = 24 + offset;
      const id = `glyph${index}${pass}`;

      defs.push(
        `<mask id="${id}" maskUnits="userSpaceOnUse" x="${left}" y="${top}" width="${advance * 2}" height="16"><image href="${atlas}" x="${left - gx * 2}" y="${top - gy * 2}" width="256" height="256"/></mask>`
      );
      badgeRects.push(
        `<rect x="${left}" y="${top}" width="${advance * 2}" height="16" fill="${ink}" mask="url(#${id})"/>`
      );
    }
  }

  x += advance * 2;
}

const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="64" viewBox="0 0 176 64" role="img" aria-labelledby="title desc" style="image-rendering:pixelated" shape-rendering="crispEdges"><title id="title">grasscn</title><desc id="desc">Original Minecraft grass-block inventory item with a grass cn pixel-text badge.</desc><defs>${defs.join("")}</defs><image href="${block}" x="0" y="8" width="48" height="48"/>${badgeRects.join("")}</svg>\n`;

await writeFile(path.join(assets, "grasscn-logo.svg"), logo);

// oxlint-disable-next-line eslint/sort-keys -- Retain the existing serialized field order and contextual required-key checks; a dynamic entries record loses this producer shape.
generated["grasscn-logo.svg"] = {
  width: 176,
  height: 64,
  sha256: hash(Buffer.from(logo)),
  text: "grass cn",
  composition:
    "Native GUI-scale-3 grass item plus original popup nine-slice artwork and original ASCII bitmap glyphs; layout is an original project badge",
};

await cp(first, path.join(references, "native-one"), { recursive: true });

await cp(second, path.join(references, "native-two"), { recursive: true });

const blockSourceBytes = await readFile(
  pixelPerfectFile("tests/reference/branding/model-assets.json")
);

// SAFETY: this fixed retained source document owns the provenance copied below; its contract is inferred from that same document.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const blockSource = JSON.parse(
  blockSourceBytes.toString("utf-8")
) as typeof modelAssets;

const popupSourceBytes = await readFile(
  pixelPerfectFile("tests/reference/card/asset-provenance.json")
);

// SAFETY: this fixed retained source document owns the provenance copied below; its contract is inferred from that same document.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const popupSource = JSON.parse(
  popupSourceBytes.toString("utf-8")
) as typeof popupAssets;

// oxlint-disable-next-line eslint/sort-keys -- Preserve this serialized field order and source spread overwrite/evaluation behavior; retain its inferred producer shape.
const provenance = {
  project: "grasscn",
  minecraftVersion: "26.2",
  ...one,
  cases,
  sourceAssets: Object.fromEntries<
    string | typeof blockSource | typeof popupSource
  >([
    ["block", blockSource],
    ["popup", popupSource],
    [
      "asciiGlyphMetricsSha256",
      hash(await readFile(webFile("registry/ui/minecraft-font.ts"))),
    ],
    ["asciiRasterSha256", hash(Buffer.from(atlas.split(",")[1], "base64"))],
  ]),
  generated,
};

await writeFile(
  webFile("branding.provenance.json"),
  `${JSON.stringify(provenance, null, 2)}\n`
);

console.log(
  "Prepared original native grass icons and grasscn bitmap badge; both native runs match exactly"
);
