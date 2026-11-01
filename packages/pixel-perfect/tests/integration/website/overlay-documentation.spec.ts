import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { PNG } from "pngjs";

import { expect, test, pixelPerfectTest } from "@grasscn/pixel-perfect/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
function compareFaces(actual: PNG, expected: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ width: actual.width, height: actual.height });
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
  return { differingPixels, diff };
}
const slugs = [
  "tooltip",
  "dialog",
  "alert-dialog",
  "popover",
  "dropdown-menu",
  "context-menu",
  "menubar",
  "sheet",
  "drawer",
  "command",
  "avatar",
  "table",
  "calendar",
  "date-picker",
  "item",
  "data-table",
  "carousel",
  "message",
  "bubble",
  "message-scroller",
  "attachment",
  "chart",
];

pixelPerfectTest(
  "default documentation packaged avatar faces match native PlayerFaceExtractor",
  async ({ page }, info) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto(`${origin}/docs/components/avatar`);
    const faces = page
      .locator(".documentation-example")
      .first()
      .locator("[data-mc-avatar-face]");
    const manifest = JSON.parse(
      await readFile(
        new URL("../../reference/avatar/manifest.json", import.meta.url),
        "utf8"
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
        manifest.cases.find((entry: { name: string }) => entry.name === name)
          .sha256
      );
      const expected = PNG.sync.read(expectedBytes),
        actualBytes = await faces.nth(index).screenshot(),
        actual = PNG.sync.read(actualBytes);
      const probe = PNG.sync.read(expectedBytes);
      probe.data[0] ^= 1;
      expect(compareFaces(probe, expected).differingPixels).toBe(1);
      const { differingPixels, diff } = compareFaces(actual, expected);
      const metrics = {
        reference: name,
        differingPixels,
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
