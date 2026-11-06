// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { InventoryAsset } from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";

const [input] = process.argv.slice(2);

if (!input) {
  throw new Error(
    "Pass the directory containing original menu-background and separator textures"
  );
}

// SAFETY: inspect-ui-catalog.py emits a complete asset table from the pinned archive, including the literal members consumed here.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as NativeInventory & { assets: Record<string, InventoryAsset> };

const css = [
  "/* Original Minecraft menu textures: Mojang Studios. Embedded unchanged. */",
  ":root {",
];

const sources: Record<string, { sha256: string; embeddedBytes: string }> = {};

const assetInputNames = [
  "menu_background.png",
  "header_separator.png",
  "footer_separator.png",
];

const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(input, filename))
  )
);

for (const [variable, filename] of [
  ["menu", "menu_background.png"],
  ["header", "header_separator.png"],
  ["footer", "footer_separator.png"],
]) {
  const member = `assets/minecraft/textures/gui/${filename}`;
  const bytesRead = assetInputReads[assetInputNames.indexOf(filename)];

  if (bytesRead.status === "rejected") {
    throw bytesRead.reason;
  }

  const bytes = bytesRead.value;
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  if (sha256 !== inventory.assets[member].sha256) {
    throw new Error(`Original menu asset changed: ${member}`);
  }

  css.push(
    `  --preview-${variable}: url("data:image/png;base64,${bytes.toString("base64")}");`
  );
  // oxlint-disable-next-line eslint/sort-keys -- Retain the existing serialized field order and contextual required-key checks; a dynamic entries record loses this producer shape.
  sources[member] = {
    sha256,
    embeddedBytes: "unchanged",
  };
}

css.push("}");

await writeFile(webFile("minecraft-theme-assets.css"), `${css.join("\n")}\n`);

await writeFile(
  webFile("assets.provenance.json"),
  `${JSON.stringify(
    { sourceJarSha256: inventory.jarSha256, sources },
    null,
    2
  )}\n`
);
