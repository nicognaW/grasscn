// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InventoryAsset,
  SpriteMetadata,
} from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";
import { PNG } from "pngjs";

const [input] = process.argv.slice(2);

if (!input) {
  throw new Error(
    "Pass the original popup background PNG and metadata directory"
  );
}

// SAFETY: the retained native inventory is produced by the catalog exporter and pins these original assets.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory & { assets: Record<string, InventoryAsset> };

const member = "assets/minecraft/textures/gui/sprites/popup/background.png";

const bytes = await readFile(path.join(input, "background.png"));
const metadata = await readFile(path.join(input, "background.png.mcmeta"));

const hash = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");

if (
  hash(bytes) !== inventory.assets[member].sha256 ||
  hash(metadata) !== inventory.assets[member].metadataSha256
) {
  throw new Error("Original popup asset changed");
}

const image = PNG.sync.read(bytes);

// SAFETY: the hash-matched original mcmeta document supplies the native sprite nine-slice geometry.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const metadataDocument = JSON.parse(
  metadata.toString("utf-8")
) as SpriteMetadata;

const { scaling } = metadataDocument.gui;

// SAFETY: the original popup background mcmeta uses a uniform numeric border (the retained catalog pins its bytes).
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const border = scaling.border as number;

const widths = [border, image.width - border * 2, border];
const heights = [border, image.height - border * 2, border];

const uri = (data: Buffer) =>
  `url("data:image/png;base64,${data.toString("base64")}")`;

const pieces = [];

for (let row = 0, y = 0; row < 3; row += 1) {
  for (let col = 0, x = 0; col < 3; col += 1) {
    const piece = new PNG({ height: heights[row], width: widths[col] });
    PNG.bitblt(image, piece, x, y, piece.width, piece.height, 0, 0);
    pieces.push(uri(PNG.sync.write(piece)));

    x += widths[col];
  }

  y += heights[row];
}

await writeFile(
  webFile("registry/ui/minecraft-card-sprite.ts"),
  `// Original Minecraft popup artwork: Mojang Studios. Pieces are exact PNG crops.\nexport const minecraftCardSprite = ${JSON.stringify(
    Object.fromEntries([
      ["width", image.width],
      ["height", image.height],
      [
        "border",
        Object.fromEntries([
          ["left", border],
          ["top", border],
          ["right", border],
          ["bottom", border],
        ]),
      ],
      ["stretch", scaling.stretch_inner ?? false],
      ["image", uri(bytes)],
      ["pieces", pieces],
    ])
  )} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/card/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["member", member],
      ["sha256", hash(bytes)],
      ["metadataSha256", hash(metadata)],
      ["scaling", scaling],
      [
        "sourceMethod",
        "PopupScreen.extractBackground; GuiGraphicsExtractor.blitSprite",
      ],
      [
        "scope",
        "Native popup panel surface only. Card section layout is a web composition, not an independent vanilla screen.",
      ],
    ]),
    null,
    2
  )}\n`
);
