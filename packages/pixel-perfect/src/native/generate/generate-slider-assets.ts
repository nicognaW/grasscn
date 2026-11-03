// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InventoryAsset,
  NativeNineSlice,
  SpriteMetadata,
  SpriteSource,
  SliderSprite,
} from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";
import { PNG } from "pngjs";

const [input] = process.argv.slice(2);

if (!input) {
  throw new Error("Pass the extracted original slider PNG/metadata directory");
}

// SAFETY: the retained native inventory pins the sprite/metadata inputs used below.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory;

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const isUniformBorder = (border: NativeNineSlice["border"]): border is number =>
  typeof border === "number";

const uri = (data: Buffer) =>
  `url("data:image/png;base64,${data.toString("base64")}")`;

const sprites: Record<string, SliderSprite> = {};
const sources: Record<string, SpriteSource> = {};

const assetInputNames = [
  "slider.png",
  "slider.png.mcmeta",
  "slider_highlighted.png",
  "slider_highlighted.png.mcmeta",
  "slider_handle.png",
  "slider_handle.png.mcmeta",
  "slider_handle_highlighted.png",
  "slider_handle_highlighted.png.mcmeta",
];
const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(input, filename))
  )
);

for (const name of [
  "slider",
  "slider_highlighted",
  "slider_handle",
  "slider_handle_highlighted",
]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;
  const bytesRead = assetInputReads[assetInputNames.indexOf(`${name}.png`)];

  if (bytesRead.status === "rejected") {
    throw bytesRead.reason;
  }

  const bytes = bytesRead.value;
  const metadataRead =
    assetInputReads[assetInputNames.indexOf(`${name}.png.mcmeta`)];

  if (metadataRead.status === "rejected") {
    throw metadataRead.reason;
  }

  const metadata = metadataRead.value;

  // SAFETY: these original slider members are present in the pinned native inventory.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const original = inventory.assets[member] as InventoryAsset;

  if (
    sha(bytes) !== original.sha256 ||
    sha(metadata) !== original.metadataSha256
  ) {
    throw new Error(`Source changed: ${member}`);
  }

  const image = PNG.sync.read(bytes);

  // SAFETY: hash-matched original mcmeta files define this nine-slice geometry.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const { scaling } = (JSON.parse(metadata.toString("utf-8")) as SpriteMetadata)
    .gui;

  const border = isUniformBorder(scaling.border)
    ? Object.fromEntries([
        ["left", scaling.border],
        ["top", scaling.border],
        ["right", scaling.border],
        ["bottom", scaling.border],
      ])
    : scaling.border;

  const widths = [
    border.left,
    image.width - border.left - border.right,
    border.right,
  ];

  const heights = [
    border.top,
    image.height - border.top - border.bottom,
    border.bottom,
  ];

  const pieces = [];

  for (let row = 0, y = 0; row < 3; row += 1) {
    for (let col = 0, x = 0; col < 3; col += 1) {
      const tile = new PNG({ height: heights[row], width: widths[col] });
      PNG.bitblt(image, tile, x, y, tile.width, tile.height, 0, 0);
      pieces.push(uri(PNG.sync.write(tile)));

      x += widths[col];
    }

    y += heights[row];
  }

  // SAFETY: these literal ordered fields are the exact cropped-sprite output contract.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  sprites[name] = Object.fromEntries([
    ["width", image.width],
    ["height", image.height],
    ["border", border],
    ["stretch", scaling.stretch_inner ?? false],
    ["image", uri(bytes)],
    ["pieces", pieces],
  ]) as SliderSprite;
  // SAFETY: these literal ordered fields define the pinned slider source and metadata.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  sources[member] = Object.fromEntries([
    ["sha256", sha(bytes)],
    ["metadataSha256", sha(metadata)],
    ["scaling", scaling],
  ]) as SpriteSource;
}

await writeFile(
  webFile("registry/ui/minecraft-slider-sprites.ts"),
  `// Original artwork: Mojang Studios. Pieces are exact crops of the original textures.\nexport const minecraftSliderSprites = ${JSON.stringify(sprites)} as const\n`
);

const textAssets = await readFile(
  webFile("registry/ui/minecraft-assets.css"),
  "utf-8"
);

// SAFETY: the shared generated font sheet owns this font-face marker; preserve its original missing-marker failure.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const fontFace = (/@font-face[^\n]+/.exec(textAssets) as RegExpExecArray)[0];

const atlasMatch =
  /--mc-ascii-atlas: (url\("[^"]+"\)); --mc-atlas-size: (\d+)/.exec(textAssets);

// SAFETY: the generated font sheet owns these two capture fields; preserve the original null/index failure.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const atlas = atlasMatch as RegExpExecArray;

await writeFile(
  webFile("registry/ui/minecraft-text-assets.css"),
  `${fontFace}\n.mc-bitmap { --mc-ascii-atlas: ${atlas[1]}; --mc-atlas-size: ${atlas[2]}; }\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/slider/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["sources", sources],
      [
        "font",
        "Original ASCII bitmap atlas and existing recovered advances; texture pieces are exact crops, never reference screenshots.",
      ],
    ]),
    null,
    2
  )}\n`
);
