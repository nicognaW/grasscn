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

const [directory] = process.argv.slice(2);

if (!directory) {
  throw new Error("Pass the original menu-list texture directory");
}

// SAFETY: inspect-ui-catalog.py emits a complete asset table from the pinned archive, including the literal members consumed here.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory & {
  assets: Record<
    | "assets/minecraft/textures/gui/menu_list_background.png"
    | "assets/minecraft/textures/gui/header_separator.png"
    | "assets/minecraft/textures/gui/footer_separator.png",
    InventoryAsset
  >;
};

const textures: Record<string, string> = {};

const sources: Record<string, SpriteSource> = {};

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const assetInputNames = [
  "menu_list_background.png",
  "header_separator.png",
  "footer_separator.png",
];

const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(directory, filename))
  )
);

for (const name of [
  "menu_list_background",
  "header_separator",
  "footer_separator",
] as const) {
  const bytesRead = assetInputReads[assetInputNames.indexOf(`${name}.png`)];

  if (bytesRead.status === "rejected") {
    throw bytesRead.reason;
  }

  const bytes = bytesRead.value;
  const member = `assets/minecraft/textures/gui/${name}.png` as const;

  assert.equal(hash(bytes), inventory.assets[member].sha256);
  textures[name] = `url("data:image/png;base64,${bytes.toString("base64")}")`;
  sources[member] = { sha256: hash(bytes) };
}

for (const name of [
  "button",
  "button_highlighted",
  "button_disabled",
  "scroller",
  "scroller_background",
]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;
  const original = inventory.assets[member];
  assert.ok(original);

  const source: SpriteSource = { sha256: original.sha256 };

  if (original.metadataSha256 !== undefined && original.metadataSha256 !== "") {
    source.metadataSha256 = original.metadataSha256;
    // SAFETY: inspect-ui-catalog.py emits parsed mcmeta with metadataSha256; these literal native widget entries contain gui.scaling.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const metadata = original.metadata as SpriteMetadata;
    source.scaling = metadata.gui.scaling;
  }

  sources[member] = source;
}

await writeFile(
  webFile("registry/ui/minecraft-select-assets.ts"),
  `// Original Minecraft list textures: Mojang Studios. Unchanged PNG bytes.\nexport const minecraftSelectAssets = ${JSON.stringify(
    textures
  )} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/select/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["sources", sources],
      [
        "rendering",
        "Original CycleButton.displayOnlyValue uses AbstractButton sprites and scrolling label with2-pixel margins. Popup supplies controlled labels and geometry to original LanguageSelectionList and Entry classes, through reflection only for constructor/private label access. Rows270x18, content padding2, label centered at row y+5; selection1-pixel outline white when the list has a focused entry, otherwise808080, inside black. Native menu-list background and2-pixel header/footer separators are retained. Scrollbar x=rowRight+8, width6; native integer thumb geometry. Web hover-to-focus, popup positioning, optional grouping and commit behavior are Radix composition. Native pure-hover cases use a public pointer-move override to hold selection/focus fixed. Original CycleButton opening click uses ui.button.click; original language-list entry selection and scrolling are silent.",
      ],
    ]),
    null,
    2
  )}\n`
);

console.log("Generated original Select textures and source pins");
