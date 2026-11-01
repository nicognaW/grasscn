// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectFile, webFile } from "@ppt/paths";
import { PNG } from "pngjs";

const input = process.argv[2];

assert.ok(input, "Pass a directory containing the four original checkbox PNGs");

const locationFile = "tests/reference/menu-parts/checkbox-atlas.json";

const locations = JSON.parse(
  await readFile(pixelPerfectFile(locationFile), "utf-8")
);

const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
);

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const sprites = {};
const sources = {};

let height;
let width;

for (const name of [
  "checkbox",
  "checkbox_highlighted",
  "checkbox_selected",
  "checkbox_selected_highlighted",
]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;
  const bytes = await readFile(path.join(input, `${name}.png`));

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
  sprites[name] = Object.fromEntries([
    ["width", image.width],
    ["height", image.height],
    ["u0", native.u0],
    ["u1", native.u1],
    ["v0", native.v0],
    ["v1", native.v1],
    ["x", Math.round(native.u0 * w)],
    ["y", Math.round(native.v0 * h)],
    ["image", `data:image/png;base64,${bytes.toString("base64")}`],
    ["rgba", image.data.toString("base64")],
  ]);
  sources[member] = Object.fromEntries([
    ["sha256", hash(bytes)],
    ["width", image.width],
    ["height", image.height],
  ]);
}

await writeFile(
  webFile("registry/ui/minecraft-menu-checkbox-assets.ts"),
  `// Original Minecraft GUI sprites and observed runtime atlas coordinates.\nexport const menuCheckboxAtlas=${JSON.stringify(
    Object.fromEntries([
      ["width", width],
      ["height", height],
      ["sprites", sprites],
    ])
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
