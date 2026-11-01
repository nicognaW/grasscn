// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectFile, webFile } from "@ppt/paths";

const input = process.argv[2];

if (!input) {
  throw new Error(
    "Pass the original text-field PNG/metadata and ASCII atlas directory"
  );
}

const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
);

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const assets = {};
const provenance = {};

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
  const bytes = await readFile(path.join(input, file));

  if (hash(bytes) !== inventory.assets[member].sha256) {
    throw new Error(`Original source changed: ${member}`);
  }

  assets[key] = `data:image/png;base64,${bytes.toString("base64")}`;
  provenance[member] = Object.fromEntries([
    ["sha256", hash(bytes)],
    ["embeddedBytes", "unchanged"],
  ]);

  if (key !== "atlas") {
    const metadata = await readFile(path.join(input, `${file}.mcmeta`));

    if (hash(metadata) !== inventory.assets[member].metadataSha256) {
      throw new Error(`Metadata changed: ${member}`);
    }

    provenance[member].scaling = JSON.parse(metadata).gui.scaling;
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
