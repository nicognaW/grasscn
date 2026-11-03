// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InventoryAsset,
  SpriteMetadata,
  SpriteSource,
  FontProvenance,
} from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";

const [directory] = process.argv.slice(2);

if (!directory) {
  throw new Error("Pass the original scroller PNG and metadata directory");
}

const inventoryBytes = await readFile(
  pixelPerfectFile("tests/reference/catalog/native-inventory.json")
);

// SAFETY: the retained native inventory pins these scroller/metadata inputs.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  inventoryBytes.toString("utf-8")
) as NativeInventory;

const assets: Record<string, string> = {};
const sources: Record<string, SpriteSource> = {};

const hash = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");

const assetInputNames = [
  "scroller.png",
  "scroller.png.mcmeta",
  "scroller_background.png",
  "scroller_background.png.mcmeta",
];

const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(directory, filename))
  )
);

for (const name of ["scroller", "scroller_background"]) {
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

  // SAFETY: these original scroller members are present in the pinned native inventory.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const original = inventory.assets[member] as InventoryAsset;

  if (
    hash(bytes) !== original.sha256 ||
    hash(metadata) !== original.metadataSha256
  ) {
    throw new Error(`Original scrollbar changed: ${name}`);
  }

  assets[name] = `data:image/png;base64,${bytes.toString("base64")}`;
  // SAFETY: these ordered entries define this original sprite source pin.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  sources[member] = Object.fromEntries([
    ["sha256", hash(bytes)],
    ["metadataSha256", hash(metadata)],
    [
      "scaling",
      // SAFETY: the just hash-matched mcmeta file supplies this original nine-slice geometry.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      (JSON.parse(metadata.toString("utf-8")) as SpriteMetadata).gui.scaling,
    ],
  ]) as SpriteSource;
}

await writeFile(
  webFile("registry/ui/minecraft-textarea-assets.ts"),
  `// Original Minecraft scroller artwork: Mojang Studios. Unchanged PNG bytes.\nexport const minecraftTextareaAssets = ${JSON.stringify(assets)} as const\n`
);

const fontBytes = await readFile(
  pixelPerfectFile("tests/reference/input-cjk/asset-provenance.json")
);

// SAFETY: indexed font provenance owns these resource and glyph-probe identities.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const font = JSON.parse(fontBytes.toString("utf-8")) as FontProvenance;

const glyphAtlas = await readFile(
  pixelPerfectFile("tests/reference/input-cjk/glyph-atlas.json")
);

for (const component of ["textarea", "textarea-cjk"]) {
  await writeFile(`tests/reference/${component}/glyph-atlas.json`, glyphAtlas);
  await writeFile(
    `tests/reference/${component}/asset-provenance.json`,
    `${JSON.stringify(
      Object.fromEntries([
        ["sourceJarSha256", inventory.jarSha256],
        ["sources", { ...sources, ...font.sources }],
        ["glyphAtlasSha256", font.glyphAtlasSha256],
        ["glyphProbeSourceSha256", font.glyphProbeSourceSha256],
        [
          "rendering",
          "Original text_field normal/highlighted textures are shared with Input. Original scroller/background use their own 6x32 border-1 nine-slice metadata. Native inner padding4, line height9, text E0E0E0 with shadow, cursor D0D0D0. CJK cases use original indexed Unihex pixels and observed native glyph UVs; other glyph sampling is unverified.",
        ],
      ]),
      null,
      2
    )}\n`
  );
}
