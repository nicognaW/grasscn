import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftSelectAssets } from "@grasscn/web/ui/minecraft-select-assets";
import { selectUnihexAtlas } from "@grasscn/web/ui/minecraft-select-atlas";
import { pixelPerfectFile } from "@ppt/paths";

import type BoundaryReference2 from "../reference/select-extra/glyph-atlas.json";
import type BoundaryReference3 from "../reference/select-extra/repeatability.json";
import type BoundaryReference1 from "../reference/select/asset-provenance.json";

test("Select retains original list texture bytes", () => {
  const provenance =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/select/asset-provenance.json"),
        "utf-8"
      )
    ) as typeof BoundaryReference1 & {
      sources: Record<
        string,
        (typeof BoundaryReference1)["sources"][keyof (typeof BoundaryReference1)["sources"]]
      >;
    };

  for (const [name, uri] of Object.entries(minecraftSelectAssets)) {
    const bytes = Buffer.from(
      /base64,(?<pngBase64>[A-Za-z0-9+/=]+)/u.exec(uri)![1],
      "base64"
    );

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      provenance.sources[`assets/minecraft/textures/gui/${name}.png`].sha256
    );
  }
});

test("Select uses the observed CJK atlas without changing the original renderer", () => {
  const observed =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/select-extra/glyph-atlas.json"),
        "utf-8"
      )
    ) as Record<
      string,
      (typeof BoundaryReference2)[keyof typeof BoundaryReference2]
    >;

  const atlasCodepoints = Object.keys(selectUnihexAtlas);

  atlasCodepoints.sort();

  const atlasComparison = expect(atlasCodepoints);

  const observedCodepoints = Object.keys(observed);

  observedCodepoints.sort();

  atlasComparison.toEqual(observedCodepoints);

  for (const [code, uv] of Object.entries(selectUnihexAtlas)) {
    for (const axis of ["u0", "u1", "v0", "v1"] as const) {
      expect(uv[axis]).toBe(observed[code][axis]);
    }
  }

  const repeat =
    // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
    JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/select-extra/repeatability.json"),
        "utf-8"
      )
    ) as typeof BoundaryReference3;

  expect(repeat.glyphObservationEnabled).toEqual({
    runOne: true,
    runTwo: false,
  });
  expect(repeat.cases).toHaveLength(144);

  for (const c of repeat.cases) {
    expect(c.mismatchedPixels).toBe(0);
  }
});
