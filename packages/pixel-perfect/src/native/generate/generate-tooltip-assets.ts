// Ordered entries preserve generated source and provenance byte order.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InventoryAsset,
  SpriteMetadata,
  SpriteSource,
} from "@ppt/native/generate/asset-protocol";
import type { GlyphUV } from "@ppt/native/generate/glyph-atlas";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import type { NativeInventory } from "@ppt/runtime/map-evidence";
import { PNG } from "pngjs";

const [input] = process.argv.slice(2);

if (!input) {
  throw new Error(
    "Pass the original tooltip background/frame PNG and metadata directory"
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

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const sprites: Record<
  string,
  {
    width: number;
    height: number;
    border: { left: number; top: number; right: number; bottom: number };
    stretch: boolean;
    image: string;
    rgba: string;
    pieces: string[];
  }
> = {};

const sources: Record<string, SpriteSource> = {};

const placementBytes = await readFile(
  pixelPerfectFile("tests/reference/tooltip/atlas-placement.json")
);

// SAFETY: the retained AtlasProbeMain output maps original sprite identities to observed native atlas UV coordinates.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const placement = JSON.parse(placementBytes.toString("utf-8")) as Record<
  string,
  GlyphUV
>;

const locations: Record<string, { x: number; y: number }> = {};
let atlasHeight: number | undefined;
let atlasWidth: number | undefined;

const uri = (data: Buffer) =>
  `url("data:image/png;base64,${data.toString("base64")}")`;

const assetInputNames = [
  "background.png",
  "background.png.mcmeta",
  "frame.png",
  "frame.png.mcmeta",
];
const assetInputReads = await Promise.allSettled(
  assetInputNames.map((filename) => readFile(path.join(input, filename)))
);

for (const name of ["background", "frame"]) {
  const member = `assets/minecraft/textures/gui/sprites/tooltip/${name}.png`;

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

  if (
    hash(bytes) !== inventory.assets[member].sha256 ||
    hash(metadata) !== inventory.assets[member].metadataSha256
  ) {
    throw new Error(`Original asset changed: ${member}`);
  }

  const image = PNG.sync.read(bytes);

  // SAFETY: original tooltip mcmeta bytes have just matched the retained inventory metadata hash.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const metadataDocument = JSON.parse(
    metadata.toString("utf-8")
  ) as SpriteMetadata;

  const { scaling } = metadataDocument.gui;

  // SAFETY: both original tooltip sprite metadata records use uniform numeric borders.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const b = scaling.border as number;

  const native = Object.entries(placement).find(([key]) =>
    key.includes(`texture=minecraft:tooltip/${name}]`)
  )?.[1];

  if (!native) {
    throw new Error(`Native atlas location missing: ${name}`);
  }

  const aw = Math.round(image.width / (native.u1 - native.u0));
  const ah = Math.round(image.height / (native.v1 - native.v0));

  if ((atlasWidth ?? 0) && (aw !== atlasWidth || ah !== atlasHeight)) {
    throw new Error("Tooltip sprites use different atlases");
  }

  atlasWidth = aw;
  atlasHeight = ah;
  locations[name] = {
    x: Math.round(native.u0 * aw),
    y: Math.round(native.v0 * ah),
  };

  const widths = [b, image.width - 2 * b, b];
  const heights = [b, image.height - 2 * b, b];

  const pieces = [];

  for (let row = 0, y = 0; row < 3; row += 1) {
    for (let col = 0, x = 0; col < 3; col += 1) {
      const tile = new PNG({ height: heights[row], width: widths[col] });
      PNG.bitblt(image, tile, x, y, tile.width, tile.height, 0, 0);
      pieces.push(uri(PNG.sync.write(tile)));

      x += widths[col];
    }

    y += heights[row];
  }

  sprites[name] = {
    width: image.width,
    height: image.height,
    border: { left: b, top: b, right: b, bottom: b },
    stretch: scaling.stretch_inner ?? false,
    image: uri(bytes),
    rgba: image.data.toString("base64"),
    pieces,
  };
  sources[member] = {
    sha256: hash(bytes),
    metadataSha256: hash(metadata),
    scaling,
  };
}

await writeFile(
  webFile("registry/ui/minecraft-tooltip-sprites.ts"),
  `// Original Minecraft artwork: Mojang Studios. Pieces are exact crops of original PNGs.\nexport const minecraftTooltipSprites = ${JSON.stringify(sprites)} as const\nexport const minecraftTooltipAtlas = ${JSON.stringify(
    {
      width: atlasWidth,
      height: atlasHeight,
      locations,
    }
  )} as const\n`
);

await writeFile(
  pixelPerfectFile("tests/reference/tooltip/asset-provenance.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", inventory.jarSha256],
      ["sources", sources],
      ["atlasPlacementSha256", hash(placementBytes)],
      [
        "atlasProbeSourceSha256",
        hash(
          await readFile(
            pixelPerfectFile("tests/reference/AtlasProbeMain.java")
          )
        ),
      ],
      [
        "rendering",
        "Original background/frame with separate nine-slice metadata, native runtime atlas coordinates and source-alpha GPU blending; original ASCII glyph metrics and masks. Exact pixels depend on viewport and screen position. Solid CSS backdrops are composited; image/gradient backdrops retain original CSS surfaces without exact compositing proof.",
      ],
    ]),
    null,
    2
  )}\n`
);
