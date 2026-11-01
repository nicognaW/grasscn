// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectFile, webFile } from "@ppt/paths";
import { PNG } from "pngjs";

const input = process.argv[2];

if (!input) {
  throw new Error(
    "Pass the original tooltip background/frame PNG and metadata directory"
  );
}

const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
);

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const sprites = {};
const sources = {};

const placementBytes = await readFile(
  pixelPerfectFile("tests/reference/tooltip/atlas-placement.json")
);

const placement = JSON.parse(placementBytes);
const locations = {};
let atlasHeight;
let atlasWidth;

for (const name of ["background", "frame"]) {
  const member = `assets/minecraft/textures/gui/sprites/tooltip/${name}.png`;

  const bytes = await readFile(path.join(input, `${name}.png`));
  const metadata = await readFile(path.join(input, `${name}.png.mcmeta`));

  if (
    hash(bytes) !== inventory.assets[member].sha256 ||
    hash(metadata) !== inventory.assets[member].metadataSha256
  ) {
    throw new Error(`Original asset changed: ${member}`);
  }

  const image = PNG.sync.read(bytes);
  const { scaling } = JSON.parse(metadata).gui;
  const b = scaling.border;

  const native = Object.entries(placement).find(([key]) =>
    key.includes(`texture=minecraft:tooltip/${name}]`)
  )?.[1];

  if (!native) {
    throw new Error(`Native atlas location missing: ${name}`);
  }

  const aw = Math.round(image.width / (native.u1 - native.u0));
  const ah = Math.round(image.height / (native.v1 - native.v0));

  if (atlasWidth && (aw !== atlasWidth || ah !== atlasHeight)) {
    throw new Error("Tooltip sprites use different atlases");
  }

  atlasWidth = aw;
  atlasHeight = ah;
  locations[name] = {
    x: Math.round(native.u0 * aw),
    y: Math.round(native.v0 * ah),
  };

  const widths = [b, image.width - 2 * b, b];
  const heights = [b, image.height - 2 * b, b];

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
    [
      "border",
      Object.fromEntries([
        ["left", b],
        ["top", b],
        ["right", b],
        ["bottom", b],
      ]),
    ],
    ["stretch", scaling.stretch_inner ?? false],
    ["image", uri(bytes)],
    ["rgba", image.data.toString("base64")],
    ["pieces", pieces],
  ]);
  sources[member] = Object.fromEntries([
    ["sha256", hash(bytes)],
    ["metadataSha256", hash(metadata)],
    ["scaling", scaling],
  ]);
}

await writeFile(
  webFile("registry/ui/minecraft-tooltip-sprites.ts"),
  `// Original Minecraft artwork: Mojang Studios. Pieces are exact crops of original PNGs.\nexport const minecraftTooltipSprites = ${JSON.stringify(sprites)} as const\nexport const minecraftTooltipAtlas = ${JSON.stringify(
    Object.fromEntries([
      ["width", atlasWidth],
      ["height", atlasHeight],
      ["locations", locations],
    ])
  )} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/tooltip/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["sources", sources],
      ["atlasPlacementSha256", hash(placementBytes)],
      [
        "atlasProbeSourceSha256",
        hash(
          await readFile(
            pixelPerfectFile("tests/reference/AtlasProbeMain.java")
          )
        ),
      ],
      [
        "rendering",
        "Original background/frame with separate nine-slice metadata, native runtime atlas coordinates and source-alpha GPU blending; original ASCII glyph metrics and masks. Exact pixels depend on viewport and screen position. Solid CSS backdrops are composited; image/gradient backdrops retain original CSS surfaces without exact compositing proof.",
      ],
    ]),
    null,
    2
  )}\n`
);
