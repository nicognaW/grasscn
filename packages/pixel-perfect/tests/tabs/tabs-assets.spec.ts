import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftTabsAssets as assets } from "@grasscn/web/ui/minecraft-tabs-assets";
import { tabsUnihexAtlas } from "@grasscn/web/ui/minecraft-tabs-atlas";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type BoundaryReference2 from "../reference/tabs-extra/glyph-atlas.json";
import type BoundaryReference3 from "../reference/tabs-extra/repeatability.json";
import type BoundaryReference1 from "../reference/tabs/asset-provenance.json";

const json = (file: string) =>
  JSON.parse(readFileSync(pixelPerfectFile(file), "utf-8"));

const decode = (uri: string) =>
  Buffer.from(/base64,([A-Za-z0-9+/=]+)/u.exec(uri)![1], "base64");

test("Tabs preserve original texture bytes and exact nine-slice pixels", () => {
  const provenance =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    json(
      "tests/reference/tabs/asset-provenance.json"
    ) as typeof BoundaryReference1 & {
      sources: Record<
        string,
        (typeof BoundaryReference1)["sources"][keyof (typeof BoundaryReference1)["sources"]]
      >;
    };

  for (const [name, sprite] of Object.entries(assets.sprites)) {
    const bytes = decode(sprite.original);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      provenance.sources[
        `assets/minecraft/textures/gui/sprites/widget/${name}.png`
      ].sha256
    );
    const original = PNG.sync.read(bytes);
    let index = 0;

    for (const [y, height] of [
      [0, 2],
      [2, 22],
    ]) {
      for (const [x, width] of [
        [0, 2],
        [2, 126],
        [128, 2],
      ]) {
        const expected = new PNG({ height, width });
        PNG.bitblt(original, expected, x, y, width, height, 0, 0);
        const pieceIndex = index;
        index += 1;
        const actual = PNG.sync.read(decode(sprite.pieces[pieceIndex]));
        expect([actual.width, actual.height]).toEqual([width, height]);
        expect(actual.data.equals(expected.data)).toBe(true);
      }
    }
  }

  for (const [name, uri] of Object.entries(assets.textures)) {
    expect(createHash("sha256").update(decode(uri)).digest("hex")).toBe(
      provenance.sources[`assets/minecraft/textures/gui/${name}.png`].sha256
    );
  }
});

test("Tabs CJK atlas uses observed native UVs without changing native pixels", () => {
  const observed =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    json("tests/reference/tabs-extra/glyph-atlas.json") as Record<
      string,
      (typeof BoundaryReference2)[keyof typeof BoundaryReference2]
    >;

  expect(Object.keys(tabsUnihexAtlas).sort()).toEqual(
    Object.keys(observed).sort()
  );

  for (const [code, uv] of Object.entries(tabsUnihexAtlas)) {
    for (const axis of ["u0", "u1", "v0", "v1"] as const) {
      expect(uv[axis]).toBe(observed[code][axis]);
    }
  }

  const repeat =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    json(
      "tests/reference/tabs-extra/repeatability.json"
    ) as typeof BoundaryReference3;

  expect(repeat.glyphObservationEnabled).toEqual({
    runOne: true,
    runTwo: false,
  });
  expect(repeat.cases).toHaveLength(222);

  for (const c of repeat.cases) {
    expect(c.mismatchedPixels).toBe(0);
  }
});
