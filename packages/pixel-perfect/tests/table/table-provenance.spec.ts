import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftSelectAssets } from "@grasscn/web/ui/minecraft-select-assets";
import type { SourceProvenance } from "@ppt/native/generate/asset-protocol";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type cropDerivation from "../reference/table-background/crop-derivation.json";
import type nativeReference from "../reference/table-background/manifest.json";
import type repeatedReference from "../reference/table-background/repeatability.json";

const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

const directory = "tests/reference/table-background";

test("Table expected grip pixels are exact crops from both original native launches and retained fullframes", () => {
  // SAFETY: this read consumes retained table-background/manifest.json with its exact imported shape; retain the original read/parse and provenance hash checks.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
  ) as typeof nativeReference;

  const proofBytes = readFileSync(
    pixelPerfectFile(`${directory}/crop-derivation.json`)
  );

  // SAFETY: this read consumes retained table-background/crop-derivation.json with its exact imported source/crop fields; retain the original proof bytes and parse phase.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const proof = JSON.parse(proofBytes.toString()) as typeof cropDerivation;

  // SAFETY: this fresh repeatability read is the exact retained constituent producer named by the existing directory; preserve the original case lookup and hash assertions.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained repeatability producer boundary; no new validation.
  const repeat = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/repeatability.json`), "utf-8")
  ) as typeof repeatedReference;

  expect(hash(proofBytes)).toBe(manifest.derivation.cropProvenanceSha256);
  expect(
    hash(readFileSync(pixelPerfectFile(manifest.derivation.sourceManifest)))
  ).toBe(manifest.derivation.sourceManifestSha256);

  for (const c of proof.cases) {
    const expected = PNG.sync.read(
      readFileSync(pixelPerfectFile(`${directory}/captures/${c.name}`))
    );

    const againBytes = readFileSync(
      pixelPerfectFile(`${directory}/repeat-crops/${c.name}`)
    );

    const again = PNG.sync.read(againBytes);

    const parentBytes = readFileSync(
      pixelPerfectFile(`tests/reference/select/captures/${c.sourceCase}`)
    );

    const frameBytes = readFileSync(
      pixelPerfectFile(`tests/reference/select/frames/${c.parentFullFrame}`)
    );

    const repeatFrameBytes = readFileSync(
      pixelPerfectFile(`${directory}/repeat-frames/${c.parentFullFrame}`)
    );

    expect(hash(parentBytes)).toBe(c.parentPngSha256);
    expect(hash(frameBytes)).toBe(c.parentFullFrameSha256);
    expect(hash(repeatFrameBytes)).toBe(c.parentRepeatFullFrameSha256);
    expect(hash(againBytes)).toBe(
      // SAFETY: The retained Table derivation and repeatability producers share the same complete native crop-name set; preserve the existing lookup and PNG hash assertion.
      /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact owned producer/API boundary; no additional runtime guard. */
      (
        repeat.cases.find(
          (r: { name: string }) => r.name === c.name
        ) as (typeof repeatedReference)["cases"][number]
      )
        /* oxlint-enable typescript/no-unsafe-type-assertion */
        .runTwoPngSha256
    );
    expect(again.data.equals(expected.data)).toBe(true);

    for (const [bytes, rect] of [
      [parentBytes, c.cropWithinParent],
      [frameBytes, c.cropWithinFullFrame],
      [repeatFrameBytes, c.cropWithinFullFrame],
    ] as const) {
      const source = PNG.sync.read(bytes);
      const data = Buffer.alloc(rect.width * rect.height * 4);

      for (let y = 0; y < rect.height; y += 1) {
        const start = ((rect.y + y) * source.width + rect.x) * 4;
        source.data.copy(
          data,
          y * rect.width * 4,
          start,
          start + rect.width * 4
        );
      }

      expect([rect.width, rect.height]).toEqual([
        expected.width,
        expected.height,
      ]);
      expect(data.equals(expected.data)).toBe(true);
    }
  }
});

test("Table ships unchanged original list and separator PNG artwork", () => {
  // SAFETY: retained table-background/asset-provenance.json records SHA-256 strings under sources; this consumer reads those pins and retains its artwork/hash assertions.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const provenance = JSON.parse(
    readFileSync(
      pixelPerfectFile(`${directory}/asset-provenance.json`),
      "utf-8"
    )
  ) as SourceProvenance;

  for (const name of [
    "menu_list_background",
    "header_separator",
    "footer_separator",
  ] as const) {
    const bytes = Buffer.from(
      minecraftSelectAssets[name].split(",")[1].split('"')[0],
      "base64"
    );

    expect(hash(bytes)).toBe(
      provenance.sources[`assets/minecraft/textures/gui/${name}.png`].sha256
    );
  }
});
