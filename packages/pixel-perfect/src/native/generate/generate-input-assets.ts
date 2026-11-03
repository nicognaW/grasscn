// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InventoryAsset,
  SpriteMetadata,
  EmbeddedAssetSource,
} from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";

const [input] = process.argv.slice(2);

if (!input) {
  throw new Error(
    "Pass the original text-field PNG/metadata and ASCII atlas directory"
  );
}

// SAFETY: the retained native inventory pins the sprite/metadata inputs used below.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory;

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const assets: Record<string, string> = {};
const provenance: Record<string, EmbeddedAssetSource> = {};

const assetInputNames = [
  "text_field.png",
  "text_field.png.mcmeta",
  "text_field_highlighted.png",
  "text_field_highlighted.png.mcmeta",
  "ascii.png",
];
const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(input, filename))
  )
);

for (const [key, file, member] of [
  [
    "normal",
    "text_field.png",
    "assets/minecraft/textures/gui/sprites/widget/text_field.png",
  ],
  [
    "highlighted",
    "text_field_highlighted.png",
    "assets/minecraft/textures/gui/sprites/widget/text_field_highlighted.png",
  ],
  ["atlas", "ascii.png", "assets/minecraft/textures/font/ascii.png"],
]) {
  const bytesRead = assetInputReads[assetInputNames.indexOf(file)];

  if (bytesRead.status === "rejected") {
    throw bytesRead.reason;
  }

  const bytes = bytesRead.value;

  // SAFETY: these literal sprite/font members belong to the complete pinned native inventory.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const original = inventory.assets[member] as InventoryAsset;

  if (hash(bytes) !== original.sha256) {
    throw new Error(`Original source changed: ${member}`);
  }

  assets[key] = `data:image/png;base64,${bytes.toString("base64")}`;

  const fields = Object.fromEntries([
    ["sha256", hash(bytes)],
    ["embeddedBytes", "unchanged"],
  ]);

  // SAFETY: these literal fields produce the unchanged embedded sprite pin, later augmented only by metadata.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  provenance[member] = fields as typeof fields & EmbeddedAssetSource;

  if (key !== "atlas") {
    const metadataRead =
      assetInputReads[assetInputNames.indexOf(`${file}.mcmeta`)];

    if (metadataRead.status === "rejected") {
      throw metadataRead.reason;
    }

    const metadata = metadataRead.value;

    if (hash(metadata) !== original.metadataSha256) {
      throw new Error(`Metadata changed: ${member}`);
    }

    // SAFETY: the just hash-matched mcmeta file owns the original nine-slice geometry.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const metadataDocument = JSON.parse(
      metadata.toString("utf-8")
    ) as SpriteMetadata;

    provenance[member].scaling = metadataDocument.gui.scaling;
    provenance[member].metadataSha256 = hash(metadata);
  }
}

await writeFile(
  webFile("registry/ui/minecraft-input-assets.ts"),
  `// Original Minecraft artwork: Mojang Studios. PNG bytes embedded unchanged.\nexport const minecraftInputAssets = ${JSON.stringify(assets)} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/input/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["assets", provenance],
      [
        "rendering",
        "Software raster from original textures and glyph alpha; expected pixels come independently from the original EditBox GPU renderer.",
      ],
    ]),
    null,
    2
  )}\n`
);
