// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectFile, webFile } from "@ppt/paths";
import { PNG } from "pngjs";

const input = process.argv[2];

if (!input) {
  throw new Error("Pass the extracted original slider PNG/metadata directory");
}

const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
);

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

const sprites = {};
const sources = {};

for (const name of [
  "slider",
  "slider_highlighted",
  "slider_handle",
  "slider_handle_highlighted",
]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;
  const bytes = await readFile(path.join(input, `${name}.png`));
  const metadata = await readFile(path.join(input, `${name}.png.mcmeta`));

  if (
    sha(bytes) !== inventory.assets[member].sha256 ||
    sha(metadata) !== inventory.assets[member].metadataSha256
  ) {
    throw new Error(`Source changed: ${member}`);
  }

  const image = PNG.sync.read(bytes);
  const { scaling } = JSON.parse(metadata).gui;

  const border =
    typeof scaling.border === "number"
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

  const uri = (data) =>
    `url("data:image/png;base64,${data.toString("base64")}")`;

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

  sprites[name] = Object.fromEntries([
    ["width", image.width],
    ["height", image.height],
    ["border", border],
    ["stretch", scaling.stretch_inner ?? false],
    ["image", uri(bytes)],
    ["pieces", pieces],
  ]);
  sources[member] = Object.fromEntries([
    ["sha256", sha(bytes)],
    ["metadataSha256", sha(metadata)],
    ["scaling", scaling],
  ]);
}

await writeFile(
  webFile("registry/ui/minecraft-slider-sprites.ts"),
  `// Original artwork: Mojang Studios. Pieces are exact crops of the original textures.\nexport const minecraftSliderSprites = ${JSON.stringify(sprites)} as const\n`
);

const textAssets = await readFile(
  webFile("registry/ui/minecraft-assets.css"),
  "utf-8"
);

const fontFace = /@font-face[^\n]+/.exec(textAssets)[0];

const atlas = /--mc-ascii-atlas: (url\("[^"]+"\)); --mc-atlas-size: (\d+)/.exec(
  textAssets
);

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
