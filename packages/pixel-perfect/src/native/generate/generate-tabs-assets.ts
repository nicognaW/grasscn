// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InventoryAsset,
  SpriteMetadata,
  SpriteSource,
} from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";
import { PNG } from "pngjs";

const [directory] = process.argv.slice(2);

if (!directory) {
  throw new Error("Pass the original tab PNG and metadata directory");
}

// SAFETY: inspect-ui-catalog.py emits a complete asset table from the pinned archive, including the literal members consumed here.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory & { assets: Record<string, InventoryAsset> };

const sources: Record<string, SpriteSource> = {};

const sprites: Record<string, { original: string; pieces: string[] }> = {};

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const assetInputNames = [
  "tab.png",
  "tab.png.mcmeta",
  "tab_highlighted.png",
  "tab_highlighted.png.mcmeta",
  "tab_selected.png",
  "tab_selected.png.mcmeta",
  "tab_selected_highlighted.png",
  "tab_selected_highlighted.png.mcmeta",
  "menu_background.png",
  "header_separator.png",
];
const assetInputReads = await Promise.allSettled(
  assetInputNames.map((filename) => readFile(path.join(directory, filename)))
);

for (const name of [
  "tab",
  "tab_highlighted",
  "tab_selected",
  "tab_selected_highlighted",
]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;

  const bytesRead = assetInputReads[assetInputNames.indexOf(`${name}.png`)];

  if (bytesRead.status === "rejected") {
    throw bytesRead.reason;
  }

  const bytes = bytesRead.value;
  const metadataRead = assetInputReads[assetInputNames.indexOf(`${name}.png.mcmeta`)];

  if (metadataRead.status === "rejected") {
    throw metadataRead.reason;
  }

  const metadata = metadataRead.value;

  assert.equal(hash(bytes), inventory.assets[member].sha256);
  assert.equal(hash(metadata), inventory.assets[member].metadataSha256);

  const image = PNG.sync.read(bytes);
  const pieces = [];

  // SAFETY: hash-matched tab mcmeta owns this geometry; the original border assertion below remains active.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const metadataDocument = JSON.parse(
    metadata.toString("utf-8")
  ) as SpriteMetadata;

  const { border } = metadataDocument.gui.scaling;

  assert.deepEqual(border, {
    left: 2,
    top: 2,
    right: 2,
    bottom: 0,
  });

  for (const [y, height] of [
    [0, 2],
    [2, 22],
  ]) {
    for (const [x, width] of [
      [0, 2],
      [2, 126],
      [128, 2],
    ]) {
      const piece = new PNG({ height, width });
      PNG.bitblt(image, piece, x, y, width, height, 0, 0);
      pieces.push(
        `url("data:image/png;base64,${PNG.sync.write(piece).toString("base64")}")`
      );
    }
  }

  // SAFETY: these hash-matched metadata bytes are parsed again at the original provenance-construction phase.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const provenanceMetadata = JSON.parse(
    metadata.toString("utf-8")
  ) as SpriteMetadata;

  sources[member] = {
    sha256: hash(bytes),
    metadataSha256: hash(metadata),
    scaling: provenanceMetadata.gui.scaling,
  };
  sprites[name] = {
    original: `data:image/png;base64,${bytes.toString("base64")}`,
    pieces,
  };
}

const textures: Record<string, string> = {};

for (const name of ["menu_background", "header_separator"]) {
  const member = `assets/minecraft/textures/gui/${name}.png`;
  const bytesRead = assetInputReads[assetInputNames.indexOf(`${name}.png`)];

  if (bytesRead.status === "rejected") {
    throw bytesRead.reason;
  }

  const bytes = bytesRead.value;

  assert.equal(hash(bytes), inventory.assets[member].sha256);
  sources[member] = { sha256: hash(bytes) };
  textures[name] = `url("data:image/png;base64,${bytes.toString("base64")}")`;
}

await writeFile(
  webFile("registry/ui/minecraft-tabs-assets.ts"),
  `// Original Minecraft tab textures: Mojang Studios. Original PNG bytes and lossless nine-slice crops.\nexport const minecraftTabsAssets = ${JSON.stringify(
    { sprites, textures }
  )} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/tabs/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["sources", sources],
      [
        "rendering",
        "MenuTabBar.MenuTabButton: selected/unselected crossed with hover-or-focus picks four original sprites. Native130x24 nine-slice has borders2/2/2/0 and tiled interior. Selected fill uses original menu_background at x+2,y+2 to right-2,bottom, texture period32. Selected underline min(font.width,label pane width-4), x=floor((width-lineWidth)/2), y=22. Text y8 selected/y10 unselected, white or disabledA0 with native shadow. Native scrolling helper is sampled under a temporarily pinned/restored original time source. List width min(400,outer)-28, per-tab even rounding after integer division, left margin rounded to even. Original sound is emitted by TabManager only when selection changes.",
      ],
    ]),
    null,
    2
  )}\n`
);
