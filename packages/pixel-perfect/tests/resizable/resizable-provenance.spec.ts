import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type { SourceProvenance } from "@ppt/native/generate/asset-protocol";
import type nativeReference from "../reference/resizable/manifest.json";
import type cropDerivation from "../reference/resizable/crop-derivation.json";

const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

const directory = "tests/reference/resizable";

test("Historical scrollbar grip pixels remain exact crops from both original native launches and retained fullframes", () => {
  // SAFETY: this read consumes retained resizable/manifest.json with its exact imported shape; retain the original read/parse and provenance hash checks.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
  ) as typeof nativeReference;

  const proofBytes = readFileSync(
    pixelPerfectFile(`${directory}/crop-derivation.json`)
  );

  // SAFETY: this read consumes retained resizable/crop-derivation.json with its exact imported source/crop fields; retain the original proof bytes and parse phase.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const proof = JSON.parse(proofBytes.toString()) as typeof cropDerivation;

  const repeat = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/repeatability.json`), "utf-8")
  );

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
      pixelPerfectFile(`tests/reference/scroll-area/captures/${c.parentCase}`)
    );

    const frameBytes = readFileSync(
      pixelPerfectFile(
        `tests/reference/scroll-area/frames/${c.parentFullFrame}`
      )
    );

    const repeatFrameBytes = readFileSync(
      pixelPerfectFile(`${directory}/repeat-frames/${c.parentFullFrame}`)
    );

    expect(hash(parentBytes)).toBe(c.parentPngSha256);
    expect(hash(frameBytes)).toBe(c.parentFullFrameSha256);
    expect(hash(repeatFrameBytes)).toBe(c.parentRepeatFullFrameSha256);
    expect(hash(againBytes)).toBe(
      repeat.cases.find((r: { name: string }) => r.name === c.name)
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

test("Resizable ships unchanged original recipe-book arrow PNG artwork", () => {
  // SAFETY: retained pagination-arrow/asset-provenance.json records SHA-256 strings under sources; this consumer reads those pins and retains its artwork/hash assertions.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const provenance = JSON.parse(
    readFileSync(
      pixelPerfectFile(
        "tests/reference/pagination-arrow/asset-provenance.json"
      ),
      "utf-8"
    )
  ) as SourceProvenance;

  const css = readFileSync(
    webFile("registry/ui/minecraft-resizable-assets.css"),
    "utf-8"
  );

  let count = 0;

  for (const match of css.matchAll(
    /\.mc-resizable-arrow\[data-direction="(backward|forward)"\]\s*\{([\s\S]*?)\}/g
  )) {
    const images = [...match[2].matchAll(/data:image\/png;base64,([^")]+)/g)];
    expect(images).toHaveLength(2);

    for (const [index, image] of images.entries()) {
      const member = `assets/minecraft/textures/gui/sprites/recipe_book/page_${match[1]}${index ? "_highlighted" : ""}.png`;
      expect(hash(Buffer.from(image[1], "base64"))).toBe(
        provenance.sources[member].sha256
      );
      count += 1;
    }
  }

  expect(count).toBe(4);
  expect(readFileSync(webFile("registry/ui/resizable.tsx"), "utf-8")).toContain(
    'import "../minecraft-resizable-assets.css"'
  );
});
