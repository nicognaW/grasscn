import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveRepositoryPath } from "@ppt/paths";
import { PNG } from "pngjs";
const input = process.argv[2];
if (!input)
  throw new Error("Pass the extracted original slider PNG/metadata directory");
const inventory = JSON.parse(
  await readFile(
    resolveRepositoryPath("tests/reference/catalog/native-inventory.json"),
    "utf8"
  )
);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sprites = {},
  sources = {};
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
  )
    throw new Error(`Source changed: ${member}`);
  const image = PNG.sync.read(bytes);
  const scaling = JSON.parse(metadata).gui.scaling;
  const border =
    typeof scaling.border === "number"
      ? {
          left: scaling.border,
          top: scaling.border,
          right: scaling.border,
          bottom: scaling.border,
        }
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
  for (let row = 0, y = 0; row < 3; y += heights[row++])
    for (let col = 0, x = 0; col < 3; x += widths[col++]) {
      const tile = new PNG({ width: widths[col], height: heights[row] });
      PNG.bitblt(image, tile, x, y, tile.width, tile.height, 0, 0);
      pieces.push(uri(PNG.sync.write(tile)));
    }
  sprites[name] = {
    width: image.width,
    height: image.height,
    border,
    stretch: scaling.stretch_inner ?? false,
    image: uri(bytes),
    pieces,
  };
  sources[member] = {
    sha256: sha(bytes),
    metadataSha256: sha(metadata),
    scaling,
  };
}
await writeFile(
  resolveRepositoryPath("registry/ui/minecraft-slider-sprites.ts"),
  `// Original artwork: Mojang Studios. Pieces are exact crops of the original textures.\nexport const minecraftSliderSprites = ${JSON.stringify(sprites)} as const\n`
);
const textAssets = await readFile(
  resolveRepositoryPath("registry/ui/minecraft-assets.css"),
  "utf8"
);
const fontFace = textAssets.match(/@font-face[^\n]+/)[0];
const atlas = textAssets.match(
  /--mc-ascii-atlas: (url\("[^"]+"\)); --mc-atlas-size: (\d+)/
);
await writeFile(
  resolveRepositoryPath("registry/ui/minecraft-text-assets.css"),
  `${fontFace}\n.mc-bitmap { --mc-ascii-atlas: ${atlas[1]}; --mc-atlas-size: ${atlas[2]}; }\n`
);
await writeFile(
  resolveRepositoryPath("tests/reference/slider/asset-provenance.json"),
  JSON.stringify(
    {
      sourceJarSha256: inventory.jarSha256,
      sources,
      font: "Original ASCII bitmap atlas and existing recovered advances; texture pieces are exact crops, never reference screenshots.",
    },
    null,
    2
  ) + "\n"
);
