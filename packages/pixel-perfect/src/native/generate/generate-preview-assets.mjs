// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectFile, webFile } from "@ppt/paths";

const input = process.argv[2];

if (!input) {
  throw new Error(
    "Pass the directory containing original menu-background and separator textures"
  );
}

const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
);

const css = [
  "/* Original Minecraft menu textures: Mojang Studios. Embedded unchanged. */",
  ":root {",
];

const sources = {};

for (const [variable, filename] of [
  ["menu", "menu_background.png"],
  ["header", "header_separator.png"],
  ["footer", "footer_separator.png"],
]) {
  const member = `assets/minecraft/textures/gui/${filename}`;
  const bytes = await readFile(path.join(input, filename));
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  if (sha256 !== inventory.assets[member].sha256) {
    throw new Error(`Original menu asset changed: ${member}`);
  }

  css.push(
    `  --preview-${variable}: url("data:image/png;base64,${bytes.toString("base64")}");`
  );
  sources[member] = Object.fromEntries([
    ["sha256", sha256],
    ["embeddedBytes", "unchanged"],
  ]);
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
