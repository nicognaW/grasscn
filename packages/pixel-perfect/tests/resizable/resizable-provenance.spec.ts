import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";
const hash = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex"),
  directory = "tests/reference/resizable";
test("Historical scrollbar grip pixels remain exact crops from both original native launches and retained fullframes", () => {
  const manifest = JSON.parse(
      readFileSync(
        resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot),
        "utf8"
      )
    ),
    proofBytes = readFileSync(
      resolveRepositoryPath(
        `${directory}/crop-derivation.json`,
        pixelPerfectRoot
      )
    ),
    proof = JSON.parse(proofBytes.toString()),
    repeat = JSON.parse(
      readFileSync(
        resolveRepositoryPath(
          `${directory}/repeatability.json`,
          pixelPerfectRoot
        ),
        "utf8"
      )
    );
  expect(hash(proofBytes)).toBe(manifest.derivation.cropProvenanceSha256);
  expect(
    hash(
      readFileSync(
        resolveRepositoryPath(
          manifest.derivation.sourceManifest,
          pixelPerfectRoot
        )
      )
    )
  ).toBe(manifest.derivation.sourceManifestSha256);
  for (const c of proof.cases) {
    const expected = PNG.sync.read(
        readFileSync(
          resolveRepositoryPath(
            `${directory}/captures/${c.name}`,
            pixelPerfectRoot
          )
        )
      ),
      againBytes = readFileSync(
        resolveRepositoryPath(
          `${directory}/repeat-crops/${c.name}`,
          pixelPerfectRoot
        )
      ),
      again = PNG.sync.read(againBytes),
      parentBytes = readFileSync(
        resolveRepositoryPath(
          `tests/reference/scroll-area/captures/${c.parentCase}`,
          pixelPerfectRoot
        )
      ),
      frameBytes = readFileSync(
        resolveRepositoryPath(
          `tests/reference/scroll-area/frames/${c.parentFullFrame}`,
          pixelPerfectRoot
        )
      ),
      repeatFrameBytes = readFileSync(
        resolveRepositoryPath(
          `${directory}/repeat-frames/${c.parentFullFrame}`,
          pixelPerfectRoot
        )
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
      const source = PNG.sync.read(bytes),
        data = Buffer.alloc(rect.width * rect.height * 4);
      for (let y = 0; y < rect.height; y++) {
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
  const provenance = JSON.parse(
      readFileSync(
        resolveRepositoryPath(
          "tests/reference/pagination-arrow/asset-provenance.json",
          pixelPerfectRoot
        ),
        "utf8"
      )
    ),
    css = readFileSync(
      resolveRepositoryPath(
        "registry/ui/minecraft-resizable-assets.css",
        pixelPerfectRoot
      ),
      "utf8"
    );
  let count = 0;
  for (const match of css.matchAll(
    /\.mc-resizable-arrow\[data-direction="(backward|forward)"\]\s*\{([\s\S]*?)\}/g
  )) {
    const images = [...match[2].matchAll(/data:image\/png;base64,([^"\)]+)/g)];
    expect(images).toHaveLength(2);
    for (const [index, image] of images.entries()) {
      const member = `assets/minecraft/textures/gui/sprites/recipe_book/page_${match[1]}${index ? "_highlighted" : ""}.png`;
      expect(hash(Buffer.from(image[1], "base64"))).toBe(
        provenance.sources[member].sha256
      );
      count++;
    }
  }
  expect(count).toBe(4);
  expect(
    readFileSync(
      resolveRepositoryPath("registry/ui/resizable.tsx", pixelPerfectRoot),
      "utf8"
    )
  ).toContain('import "../minecraft-resizable-assets.css"');
});
