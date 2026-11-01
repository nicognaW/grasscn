import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftToastSprite } from "@grasscn/web/ui/minecraft-toast-assets";
import {
  toastGlyphAtlas,
  toastSpriteAtlas,
} from "@grasscn/web/ui/minecraft-toast-atlas";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

test("SystemToast retains original PNG bytes, RGBA and asymmetric nine-slice metadata", () => {
  const inventory = JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
      "utf-8"
    )
  );

  const pin =
    inventory.assets["assets/minecraft/textures/gui/sprites/toast/system.png"];

  const bytes = Buffer.from(minecraftToastSprite.image.split(",")[1], "base64");
  const image = PNG.sync.read(bytes);

  expect(hash(bytes)).toBe(pin.sha256);
  expect(Buffer.from(minecraftToastSprite.rgba, "base64")).toEqual(image.data);
  expect([image.width, image.height]).toEqual([160, 64]);
  expect(minecraftToastSprite.border).toEqual(pin.metadata.gui.scaling.border);
  expect(minecraftToastSprite.stretch).toBe(false);
});

test("SystemToast uses the UVs and metrics observed in its normalized native context", () => {
  const glyphs = JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/toast/glyph-atlas.json"),
      "utf-8"
    )
  );

  const observed = Object.values(
    JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/toast/toast-atlas.json"),
        "utf-8"
      )
    )
  )[0] as any;

  expect(toastGlyphAtlas).toEqual(glyphs);
  expect(Object.keys(glyphs)).toHaveLength(112);
  expect(toastSpriteAtlas.width).toBe(
    Math.round(160 / (observed.u1 - observed.u0))
  );
  expect(toastSpriteAtlas.height).toBe(
    Math.round(64 / (observed.v1 - observed.v0))
  );
  expect(toastSpriteAtlas.x).toBe(
    Math.round(observed.u0 * toastSpriteAtlas.width)
  );
  expect(toastSpriteAtlas.y).toBe(
    Math.round(observed.v0 * toastSpriteAtlas.height)
  );
});
