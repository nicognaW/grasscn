// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectFile, webFile } from "@ppt/paths";
import { PNG } from "pngjs";

const input = process.argv[2];

if (!input) {
  throw new Error(
    "Pass the directory containing the four original checkbox PNGs"
  );
}

const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
);

const css = [
  "/* Minecraft original textures: Mojang Studios. Native-sized derivatives use the documented nearest-sampling rule. */",
  ":root {",
];

const assets = {};
const hash = (data) => createHash("sha256").update(data).digest("hex");

for (const name of [
  "checkbox",
  "checkbox_selected",
  "checkbox_highlighted",
  "checkbox_selected_highlighted",
]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;
  const bytes = await readFile(path.join(input, `${name}.png`));

  if (hash(bytes) !== inventory.assets[member].sha256) {
    throw new Error(`Original asset digest changed: ${member}`);
  }

  const source = PNG.sync.read(bytes);
  const variable = name.replaceAll("_", "-");

  const uri = (data) =>
    `url("data:image/png;base64,${data.toString("base64")}")`;

  css.push(`  --mc-${variable}: ${uri(bytes)};`);
  const derivatives = [];

  for (const scale of [1, 2, 3]) {
    const size = 17 * scale;
    const target = new PNG({ height: size, width: size });

    // Nearest samples at destination pixel centers; exact source-boundary ties
    // choose the lower texel. Observed against independent native captures.
    // Integer arithmetic avoids browser/GPU fractional-coordinate differences.
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const sx = Math.ceil(((2 * x + 1) * source.width) / (2 * size)) - 1;
        const sy = Math.ceil(((2 * y + 1) * source.height) / (2 * size)) - 1;
        const offset = (sy * source.width + sx) * 4;
        target.data.set(
          source.data.subarray(offset, offset + 4),
          (y * size + x) * 4
        );
      }
    }

    const derived = PNG.sync.write(target);
    css.push(`  --mc-${variable}-native-s${scale}: ${uri(derived)};`);
    derivatives.push(
      Object.fromEntries([
        ["scale", scale],
        ["width", size],
        ["height", size],
        ["sha256", hash(derived)],
      ])
    );
  }

  assets[member] = Object.fromEntries([
    ["sha256", hash(bytes)],
    ["embeddedBytes", "unchanged"],
    ["derivatives", derivatives],
  ]);
}

css.push("}");

await writeFile(
  webFile("registry/ui/minecraft-control-assets.css"),
  `${css.join("\n")}\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/controls/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      [
        "sampling",
        "nearest at pixel centers; exact source-boundary ties choose lower texel; dimensions 17*scale; synthesized only from original PNG bytes, never reference screenshots",
      ],
      ["assets", assets],
    ]),
    null,
    2
  )}\n`
);
