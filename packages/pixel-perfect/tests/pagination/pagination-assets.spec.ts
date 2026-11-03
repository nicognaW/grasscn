import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type BoundaryReference1 from "../reference/catalog/native-inventory.json";

test("Pagination embeds all four original recipe-book arrow PNGs unchanged", () => {
  const source = readFileSync(
    webFile("registry/ui/minecraft-pagination-assets.css"),
    "utf-8"
  );

  const inventory =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/catalog/native-inventory.json"),
        "utf-8"
      )
    ) as typeof BoundaryReference1 & {
      assets: Record<
        string,
        (typeof BoundaryReference1)["assets"][keyof (typeof BoundaryReference1)["assets"]]
      >;
    };

  const images = Array.from(
    source.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/gu),
    (match) => Buffer.from(match[1], "base64")
  );

  expect(images).toHaveLength(4);

  for (const [index, name] of [
    "backward",
    "backward_highlighted",
    "forward",
    "forward_highlighted",
  ].entries()) {
    const png = PNG.sync.read(images[index]);
    expect([png.width, png.height]).toEqual([12, 17]);
    expect(createHash("sha256").update(images[index]).digest("hex")).toBe(
      inventory.assets[
        `assets/minecraft/textures/gui/sprites/recipe_book/page_${name}.png`
      ].sha256
    );
  }
});
