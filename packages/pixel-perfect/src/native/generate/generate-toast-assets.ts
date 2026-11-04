// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InventoryAsset,
  SpriteMetadata,
} from "@ppt/native/generate/asset-protocol";
import type { GlyphMetrics, GlyphUV } from "@ppt/native/generate/glyph-atlas";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";
import { PNG } from "pngjs";

const [directory] = process.argv.slice(2);

assert.ok(
  directory,
  "Pass a directory containing the original system.png and system.png.mcmeta"
);

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// SAFETY: the retained native inventory is produced by the catalog exporter and pins these original assets.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory & { assets: Record<string, InventoryAsset> };

const member = "assets/minecraft/textures/gui/sprites/toast/system.png";
const pin = inventory.assets[member];

const bytes = await readFile(path.join(directory, "system.png"));
const metadata = await readFile(path.join(directory, "system.png.mcmeta"));

assert.equal(hash(bytes), pin.sha256);

assert.equal(hash(metadata), pin.metadataSha256);

const image = PNG.sync.read(bytes);

// SAFETY: the hash-matched original mcmeta document supplies the native sprite nine-slice geometry.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const metadataDocument = JSON.parse(
  metadata.toString("utf-8")
) as SpriteMetadata;

const { scaling } = metadataDocument.gui;

assert.equal(scaling.type, "nine_slice");

assert.deepEqual([image.width, image.height], [160, 64]);

assert.ok(
  image.data.every((channel, index) => index % 4 !== 3 || channel === 255)
);

const toastSpriteFields = [
  ["width", image.width],
  ["height", image.height],
  ["image", `data:image/png;base64,${bytes.toString("base64")}`],
  ["rgba", image.data.toString("base64")],
  ["border", scaling.border],
  ["stretch", scaling.stretch_inner ?? false],
] as const;

const sprite =
  Object.fromEntries<(typeof toastSpriteFields)[number][1]>(toastSpriteFields);

await writeFile(
  webFile("registry/ui/minecraft-toast-assets.ts"),
  `export const minecraftToastSprite = ${JSON.stringify(sprite)} as const\n`
);

// SAFETY: the retained native glyph probe exports the glyph metrics used in the generated toast atlas.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const glyphs = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/toast/glyph-atlas.json"),
    "utf-8"
  )
) as Record<string, GlyphMetrics>;

// SAFETY: the retained toast atlas probe exports the original sprite placement.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const observations = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/toast/toast-atlas.json"),
    "utf-8"
  )
) as Record<string, GlyphUV & { x: number; y: number }>;

const [native] = Object.values(observations);

const width = Math.round(image.width / (native.u1 - native.u0));
const height = Math.round(image.height / (native.v1 - native.v0));

const atlas = Object.fromEntries([
  ...Object.entries(native),
  ["width", width],
  ["height", height],
  ["x", Math.round(native.u0 * width)],
  ["y", Math.round(native.v0 * height)],
]);

const type =
  "Record<string,{u0:number;u1:number;v0:number;v1:number;left:number;right:number;up:number;down:number;advance:number;boldOffset:number;shadowOffset:number}>";

await writeFile(
  webFile("registry/ui/minecraft-toast-atlas.ts"),
  `export const toastGlyphAtlas:${type} = ${JSON.stringify(glyphs)}\nexport const toastSpriteAtlas = ${JSON.stringify(atlas)} as const\n`
);

console.log(
  `Generated original SystemToast PNG/RGBA, ${Object.keys(glyphs).length} observed glyphs and ${width}x${height} original GUI atlas placement`
);
