// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  RetainedNativeInventory,
  SeparatorSource,
} from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile, webFile } from "@ppt/paths";

const [directory] = process.argv.slice(2);

if (!directory) {
  throw new Error("Pass the original separator PNG directory");
}

// SAFETY: the retained native inventory pins the sprite/metadata inputs used below.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const inventory = JSON.parse(
  await readFile(
    pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
    "utf-8"
  )
) as RetainedNativeInventory;

const sources: Record<string, SeparatorSource> = {};
const assets: Record<string, string> = {};

const assetInputNames = [
  "header_separator.png",
  "footer_separator.png",
  "inworld_header_separator.png",
  "inworld_footer_separator.png",
];

const assetInputReads = await Promise.allSettled(
  assetInputNames.map(
    async (filename) => await readFile(path.join(directory, filename))
  )
);

for (const prefix of ["", "inworld_"] as const) {
  for (const edge of ["header", "footer"] as const) {
    const filename = `${prefix}${edge}_separator.png` as const;
    const member = `assets/minecraft/textures/gui/${filename}` as const;
    const bytesRead = assetInputReads[assetInputNames.indexOf(filename)];

    if (bytesRead.status === "rejected") {
      throw bytesRead.reason;
    }

    const bytes = bytesRead.value;
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const original = inventory.assets[member];

    assert.equal(sha256, original.sha256);
    // SAFETY: these literal ordered fields define the pinned separator hash and fixed native geometry.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    sources[member] = Object.fromEntries([
      ["sha256", sha256],
      ["width", 32],
      ["height", 2],
    ]) as SeparatorSource;

    if (prefix) {
      assert.equal(
        sha256,
        sources[`assets/minecraft/textures/gui/${edge}_separator.png`].sha256
      );
    } else {
      assets[edge] = `data:image/png;base64,${bytes.toString("base64")}`;
    }
  }
}

await writeFile(
  webFile("registry/ui/minecraft-separator-assets.ts"),
  `// Original Minecraft separator artwork: Mojang Studios. Unchanged PNG bytes.\nexport const minecraftSeparatorAssets = ${JSON.stringify(
    assets
  )} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/separator/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["sources", sources],
      [
        "rendering",
        "Original AbstractSelectionList.extractListSeparators: GUI_TEXTURED blit, u=v=0, texture32x2, drawn at native width and height2 with repeating U coordinates. Header at list.y-2; footer at list.bottom. Native runtime captures use the original method on an isolated empty list with no loaded world. In-world assets are byte-identical; world lifecycle is not exercised. Vertical orientation has no native reference and is omitted.",
      ],
    ]),
    null,
    2
  )}\n`
);
