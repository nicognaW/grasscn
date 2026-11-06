import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { InventoryAsset } from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";
import { PNG } from "pngjs";

const [directory] = process.argv.slice(2);

assert.ok(
  directory,
  "Pass a directory containing the four original recipe_book/page_*.png assets"
);

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

let css = "@layer components {\n";

const assetInputNames = [
  "page_backward.png",
  "page_backward_highlighted.png",
  "page_forward.png",
  "page_forward_highlighted.png",
];

const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(directory, filename))
  )
);

for (const direction of ["backward", "forward"]) {
  css += `.mc-pagination-arrow[data-direction="${direction}"] {\n`;

  for (const highlighted of [false, true]) {
    const name = `page_${direction}${highlighted ? "_highlighted" : ""}.png`;
    const member = `assets/minecraft/textures/gui/sprites/recipe_book/${name}`;
    const bytesRead = assetInputReads[assetInputNames.indexOf(name)];

    if (bytesRead.status === "rejected") {
      throw bytesRead.reason;
    }

    const bytes = bytesRead.value;
    const image = PNG.sync.read(bytes);

    assert.equal(hash(bytes), inventory.assets[member].sha256);
    assert.deepEqual([image.width, image.height], [12, 17]);
    assert.ok(
      [...image.data]
        .filter((_, index) => index % 4 === 3)
        .every((alpha) => alpha === 0 || alpha === 255)
    );
    css += ` --mc-pagination-arrow${highlighted ? "-highlighted" : ""}:url("data:image/png;base64,${bytes.toString("base64")}");\n`;
  }

  css += "}\n";
}

css += "}\n";

await writeFile(webFile("registry/ui/minecraft-pagination-assets.css"), css);

console.log(
  `Generated four original12×17 recipe-book page arrow sprites; pinned artifact${inventory.jarSha256}`
);
