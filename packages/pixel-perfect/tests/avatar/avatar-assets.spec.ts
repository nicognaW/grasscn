import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftAvatarSkins } from "@grasscn/web/ui/minecraft-avatar-assets";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type BoundaryReference2 from "../reference/avatar/manifest.json";
import type BoundaryReference1 from "../reference/avatar/provenance.json";

test("All18 original skins retain their PNG bytes and rawRGBA including hat transparency", () => {
  // SAFETY: this fixed Avatar provenance read consumes the same retained producer already represented by BoundaryReference1; preserve the original asset search and read phase.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained asset-provenance boundary; no runtime validation.
  const provenance = JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/avatar/provenance.json"),
      "utf-8"
    )
  ) as typeof BoundaryReference1;

  expect(Object.keys(minecraftAvatarSkins)).toHaveLength(18);

  for (const [name, asset] of Object.entries(minecraftAvatarSkins)) {
    const bytes = Buffer.from(asset.png.split(",")[1], "base64");
    const png = PNG.sync.read(bytes);

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      provenance.assets.find(
        (a) => a.path === `assets/minecraft/textures/entity/player/${name}.png`
      )!.sha256
    );
    expect([png.width, png.height]).toEqual([64, 64]);
    expect(Buffer.from(asset.rgba, "base64").equals(png.data)).toBe(true);
  }
});

test("Native Avatar reference guards pin real class members and no fake glyph observations", () => {
  const m =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/avatar/manifest.json"),
        "utf-8"
      )
    ) as typeof BoundaryReference2;

  const p =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/avatar/provenance.json"),
        "utf-8"
      )
    ) as typeof BoundaryReference1;

  expect(m.glyphObservationEnabled).toBe(false);
  expect(p.assets.filter((a) => a.path.endsWith(".class"))).toHaveLength(2);
  expect(p.nativeMethod).toContain("PlayerFaceExtractor.extractRenderState");
});
