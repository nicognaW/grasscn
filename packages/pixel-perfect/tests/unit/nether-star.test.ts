// The nether star port's glint texture matrix must equal the one the native
// 26.2 renderer computed at each captured glint time. The expected bits were
// read from TextureTransform.GLINT_TEXTURING inside the capture launches
// (NetherStarReferenceMain), not computed here.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { glintTextureMatrix } from "@grasscn/web/lib/nether-star";

import { netherStarManifestSchema } from "../../src/native/nether-star-case";
import { pixelPerfectFile } from "../../src/paths";

const manifest = netherStarManifestSchema.parse(
  JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/nether-star/manifest.json"),
      "utf-8"
    )
  )
);

const floatBits = (value: number) => {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);

  return view.getInt32(0);
};

test("glint texture matrix matches the native one at every captured glint time", () => {
  const cases = manifest.cases.filter((entry) => !entry.control);
  assert.ok(cases.length > 1);

  for (const entry of cases) {
    const native = manifest.runtime.glintTextureMatrixBits[entry.name];

    assert.deepEqual(
      glintTextureMatrix(entry.glintMillis).map(floatBits),
      native,
      entry.name
    );
  }
});
