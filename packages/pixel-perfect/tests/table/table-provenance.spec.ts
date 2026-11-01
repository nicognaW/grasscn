import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftSelectAssets } from "@grasscn/web/ui/minecraft-select-assets";
import { pixelPerfectRoot, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";
const hash = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex"),
  directory = "tests/reference/table-background";
test("Table expected grip pixels are exact crops from both original native launches and retained fullframes", () => {
  const manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf8")
    ),
    proofBytes = readFileSync(
      pixelPerfectFile(`${directory}/crop-derivation.json`)
    ),
    proof = JSON.parse(proofBytes.toString()),
    repeat = JSON.parse(
      readFileSync(pixelPerfectFile(`${directory}/repeatability.json`), "utf8")
    );
  expect(hash(proofBytes)).toBe(manifest.derivation.cropProvenanceSha256);
  expect(
    hash(readFileSync(pixelPerfectFile(manifest.derivation.sourceManifest)))
  ).toBe(manifest.derivation.sourceManifestSha256);
  for (const c of proof.cases) {
    const expected = PNG.sync.read(
        readFileSync(pixelPerfectFile(`${directory}/captures/${c.name}`))
      ),
      againBytes = readFileSync(
        pixelPerfectFile(`${directory}/repeat-crops/${c.name}`)
      ),
      again = PNG.sync.read(againBytes),
      parentBytes = readFileSync(
        pixelPerfectFile(`tests/reference/select/captures/${c.sourceCase}`)
      ),
      frameBytes = readFileSync(
        pixelPerfectFile(`tests/reference/select/frames/${c.parentFullFrame}`)
      ),
      repeatFrameBytes = readFileSync(
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
test("Table ships unchanged original list and separator PNG artwork", () => {
  const provenance = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/asset-provenance.json`), "utf8")
  );
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
