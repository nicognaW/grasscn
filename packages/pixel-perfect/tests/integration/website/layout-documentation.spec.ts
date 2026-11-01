import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { PNG } from "pngjs";

import { test, expect, pixelPerfectTest } from "@grasscn/pixel-perfect/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

function rgbaDifferences(actual: PNG, expected: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let count = 0;
  for (let offset = 0; offset < actual.data.length; offset += 4)
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    )
      count++;
  return count;
}

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
      await page.goto(`${origin}/docs/components/${slug}`);
      await page.mouse.move(0, 0);
      const elements = page
        .locator(".documentation-example")
        .first()
        .locator(`[data-slot="${slot}"]`);
      for (let index = 0; index < names.length; index++) {
        const manifest = JSON.parse(
          await readFile(
            new URL(`../../reference/${slug}/manifest.json`, import.meta.url),
            "utf8"
          )
        );
        const name = names[index];
        const bytes = await readFile(
          new URL(`../../reference/${slug}/captures/${name}`, import.meta.url)
        );
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(
          manifest.cases.find((entry: { name: string }) => entry.name === name)
            .sha256
        );
        const expected = PNG.sync.read(bytes),
          actualBytes = await elements.nth(index).screenshot(),
          actual = PNG.sync.read(actualBytes);
        const corrupt = PNG.sync.read(bytes);
        corrupt.data[0] ^= 1;
        expect(rgbaDifferences(corrupt, expected)).toBe(1);
        const differentPixels = rgbaDifferences(actual, expected);
        await writeFile(
          info.outputPath(`${slug}-${index}-actual.png`),
          actualBytes
        );
        await writeFile(
          info.outputPath(`${slug}-${index}-metrics.json`),
          JSON.stringify({
            reference: name,
            differentPixels,
            totalPixels: actual.width * actual.height,
            onePixelCorruptionDetected: true,
          })
        );
        await info.attach(`${slug}-${index}-actual.png`, {
          body: actualBytes,
          contentType: "image/png",
        });
        await info.attach(`${slug}-${index}-metrics.json`, {
          body: Buffer.from(
            JSON.stringify({
              reference: name,
              differentPixels,
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
