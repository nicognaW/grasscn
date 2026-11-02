import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { expect, pixelPerfectTest } from "@grasscn/pixel-perfect/test";
import {
  parseNativeManifest,
  nativeReference,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

const compareFaces = (actual: PNG, expected: PNG) => {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: actual.height, width: actual.width });
  let differingPixels = 0;

  for (let offset = 0; offset < actual.data.length; offset += 4) {
    const changed = !actual.data
      .subarray(offset, offset + 4)
      .equals(expected.data.subarray(offset, offset + 4));

    differingPixels += Number(changed);
    diff.data.set(
      changed ? [255, 0, 255, 255] : expected.data.subarray(offset, offset + 4),
      offset
    );
  }

  return { diff, differingPixels };
};

pixelPerfectTest(
  "default documentation packaged avatar faces match native PlayerFaceExtractor",
  async ({ page }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.goto(`${origin}/docs/components/avatar`);

    const faces = page
      .locator(".documentation-example")
      .first()
      .locator("[data-mc-avatar-face]");

    const manifest = parseNativeManifest(
      await readFile(
        new URL("../../reference/avatar/manifest.json", import.meta.url),
        "utf-8"
      )
    );

    for (const [index, name] of [
      "wide-steve-16-hat-upright-dark-s2.png",
      "slim-alex-16-hat-upright-dark-s2.png",
    ].entries()) {
      await expect(faces.nth(index)).toHaveAttribute("data-ready", "true");

      const expectedBytes = await readFile(
        new URL(`../../reference/avatar/captures/${name}`, import.meta.url)
      );

      expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
        nativeReference(manifest, name).sha256
      );

      const expected = PNG.sync.read(expectedBytes);
      const actualBytes = await faces.nth(index).screenshot();
      const actual = PNG.sync.read(actualBytes);

      const probe = PNG.sync.read(expectedBytes);
      // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
      probe.data[0] ^= 1;
      expect(compareFaces(probe, expected).differingPixels).toBe(1);
      const { differingPixels, diff } = compareFaces(actual, expected);

      const metrics = {
        differingPixels,
        reference: name,
        totalPixels: actual.width * actual.height,
      };

      await writeFile(info.outputPath(`face-${index}-actual.png`), actualBytes);
      await writeFile(
        info.outputPath(`face-${index}-diff.png`),
        PNG.sync.write(diff)
      );
      await writeFile(
        info.outputPath(`face-${index}-metrics.json`),
        JSON.stringify(metrics)
      );
      expect(differingPixels).toBe(0);
    }
  }
);
