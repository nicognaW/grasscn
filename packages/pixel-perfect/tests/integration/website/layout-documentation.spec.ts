import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { expect, pixelPerfectTest } from "@grasscn/pixel-perfect/test";
import {
  parseNativeManifest,
  nativeReference,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

const rgbaDifferences = (actual: PNG, expected: PNG) => {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let count = 0;

  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      count += 1;
    }
  }

  return count;
};

pixelPerfectTest(
  "default layout documentation Separator and Progress match retained native cases",
  async ({ page }, info) => {
    for (const [slug, slot, names] of [
      [
        "separator",
        "separator",
        ["separator-c6-s2.png", "separator-c24-s2.png"],
      ],
      ["progress", "progress", ["progress-c6-s2.png"]],
    ] as const) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
      await page.goto(`${origin}/docs/components/${slug}`);
      // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
      await page.mouse.move(0, 0);

      const elements = page
        .locator(".documentation-example")
        .first()
        .locator(`[data-slot="${slot}"]`);

      for (let index = 0; index < names.length; index += 1) {
        const manifest = parseNativeManifest(
          // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
          await readFile(
            new URL(`../../reference/${slug}/manifest.json`, import.meta.url),
            "utf-8"
          )
        );

        const name = names[index];

        // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
        const bytes = await readFile(
          new URL(`../../reference/${slug}/captures/${name}`, import.meta.url)
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(
          nativeReference(manifest, name).sha256
        );

        const expected = PNG.sync.read(bytes);
        // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
        const actualBytes = await elements.nth(index).screenshot();
        const actual = PNG.sync.read(actualBytes);

        const corrupt = PNG.sync.read(bytes);
        // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
        corrupt.data[0] ^= 1;
        expect(rgbaDifferences(corrupt, expected)).toBe(1);
        const differentPixels = rgbaDifferences(actual, expected);
        // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
        await writeFile(
          info.outputPath(`${slug}-${index}-actual.png`),
          actualBytes
        );
        // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
        await writeFile(
          info.outputPath(`${slug}-${index}-metrics.json`),
          JSON.stringify({
            differentPixels,
            onePixelCorruptionDetected: true,
            reference: name,
            totalPixels: actual.width * actual.height,
          })
        );
        // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
        await info.attach(`${slug}-${index}-actual.png`, {
          body: actualBytes,
          contentType: "image/png",
        });
        // oxlint-disable-next-line eslint/no-await-in-loop -- Assert or capture this Page state before the next route, tab, focus, or scroll transition.
        await info.attach(`${slug}-${index}-metrics.json`, {
          body: Buffer.from(
            JSON.stringify({
              differentPixels,
              reference: name,
              totalPixels: actual.width * actual.height,
            })
          ),
          contentType: "application/json",
        });
        expect(differentPixels, name).toBe(0);
      }
    }
  }
);
