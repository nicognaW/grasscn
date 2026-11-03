// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { InventoryAsset } from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";
import { PNG } from "pngjs";

const [input] = process.argv.slice(2);

assert.ok(input, "Pass a directory containing the four original checkbox PNGs");

const locationFile = "tests/reference/menu-parts/checkbox-atlas.json";

// SAFETY: the retained native atlas probe maps sprite identities to observed UV coordinates.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const locations = JSON.parse(
  await readFile(pixelPerfectFile(locationFile), "utf-8")
) as Record<
  string,
  { u0: number; u1: number; v0: number; v1: number; x: number; y: number }
>;

// SAFETY: the retained native inventory is produced by the catalog exporter and pins these original assets.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory & { assets: Record<string, InventoryAsset> };

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const sprites: Record<
  string,
  {
    width: number;
    height: number;
    u0: number;
    u1: number;
    v0: number;
    v1: number;
    x: number;
    y: number;
    image: string;
    rgba: string;
  }
> = {};

const sources: Record<
  string,
  { sha256: string; width: number; height: number }
> = {};

let height: number | undefined;
let width: number | undefined;

const assetInputNames = [
  "checkbox.png",
  "checkbox_highlighted.png",
  "checkbox_selected.png",
  "checkbox_selected_highlighted.png",
];

const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(input, filename))
  )
);

for (const name of [
  "checkbox",
  "checkbox_highlighted",
  "checkbox_selected",
  "checkbox_selected_highlighted",
]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;
  const bytesRead = assetInputReads[assetInputNames.indexOf(`${name}.png`)];

  if (bytesRead.status === "rejected") {
    throw bytesRead.reason;
  }

  const bytes = bytesRead.value;

  assert.equal(hash(bytes), inventory.assets[member].sha256);

  const image = PNG.sync.read(bytes);

  const native = Object.entries(locations).find(([key]) =>
    key.includes(`texture=minecraft:widget/${name}]`)
  )?.[1];

  assert.ok(native);

  const w = Math.round(image.width / (native.u1 - native.u0));
  const h = Math.round(image.height / (native.v1 - native.v0));

  if (width !== undefined) {
    assert.deepEqual([w, h], [width, height]);
  }

  width = w;
  height = h;
  sprites[name] = {
    width: image.width,
    height: image.height,
    u0: native.u0,
    u1: native.u1,
    v0: native.v0,
    v1: native.v1,
    x: Math.round(native.u0 * w),
    y: Math.round(native.v0 * h),
    image: `data:image/png;base64,${bytes.toString("base64")}`,
    rgba: image.data.toString("base64"),
  };
  sources[member] = {
    sha256: hash(bytes),
    width: image.width,
    height: image.height,
  };
}

await writeFile(
  webFile("registry/ui/minecraft-menu-checkbox-assets.ts"),
  `// Original Minecraft GUI sprites and observed runtime atlas coordinates.\nexport const menuCheckboxAtlas=${JSON.stringify(
    {
      width,
      height,
      sprites,
    }
  )} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/menu-parts/checkbox-assets.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["sources", sources],
      [
        "atlasPlacementSha256",
        hash(await readFile(pixelPerfectFile(locationFile))),
      ],
      ["targetLogicalSize", 17],
      [
        "renderer",
        "Native atlas UVs, original RGBA, nearest GPU sampling at the actual viewport/screen position",
      ],
    ]),
    null,
    2
  )}\n`
);

console.log(
  `Generated four original checkbox sprites in the ${width}x${height} native atlas`
);
