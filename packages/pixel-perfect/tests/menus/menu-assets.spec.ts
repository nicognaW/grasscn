import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { menuCheckboxAtlas } from "@grasscn/web/ui/minecraft-menu-checkbox-assets";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";

const inventory = JSON.parse(
  readFileSync(
    resolveRepositoryPath(
      "tests/reference/catalog/native-inventory.json",
      pixelPerfectRoot
    ),
    "utf8"
  )
);
const native = JSON.parse(
  readFileSync(
    resolveRepositoryPath(
      "tests/reference/menu-parts/checkbox-atlas.json",
      pixelPerfectRoot
    ),
    "utf8"
  )
);
for (const [name, sprite] of Object.entries(menuCheckboxAtlas.sprites)) {
  test(`Menu embeds the original ${name} texture and native atlas coordinates`, () => {
    const bytes = Buffer.from(sprite.image.split(",")[1], "base64"),
      png = PNG.sync.read(bytes);
    const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`;
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      inventory.assets[member].sha256
    );
    expect([png.width, png.height]).toEqual([20, 20]);
    expect(Buffer.from(sprite.rgba, "base64").equals(png.data)).toBe(true);
    const placement = Object.entries(native).find(([key]) =>
      key.includes(`texture=minecraft:widget/${name}]`)
    )![1] as Record<string, number>;
    for (const key of ["u0", "u1", "v0", "v1"] as const)
      expect(Math.fround(sprite[key])).toBe(Math.fround(placement[key]));
    expect([sprite.x, sprite.y]).toEqual([placement.x + 1, placement.y + 1]);
    expect([menuCheckboxAtlas.width, menuCheckboxAtlas.height]).toEqual([
      1024, 1024,
    ]);
  });
}
