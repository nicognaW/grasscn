import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type { ToggleReferenceCase } from "@ppt/installed/reference-case";

interface SwitchCaptureManifest {
  cases: ToggleReferenceCase[];
}

const directory = "tests/reference/switch";

// SAFETY: The fixed retained switch manifest supplies every consumed shared capture field, numeric x/y, string background and boolean checked required by ToggleReferenceCase.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained producer boundary; preserve this original runtime read/parse phase.
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as SwitchCaptureManifest;

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !expected.data
      .subarray(i, i + 4)
      .equals(actual.data.subarray(i, i + 4));

    mismatchedPixels += Number(mismatch);
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            Math.floor(expected.data[i] / 4),
            Math.floor(expected.data[i + 1] / 4),
            Math.floor(expected.data[i + 2] / 4),
            255,
          ],
      i
    );
  }

  return { diff, mismatchedPixels };
};

test("Switch comparator catches a changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

test.describe("Switch native matrix", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of manifest.cases) {
    test(`Switch native pixels: ${c.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: 900, width: 1536 });
      await page.goto(
        `/?component=switch&checked=${c.checked}&state=${c.state}&scale=${c.scale}&width=${c.width}`
      );
      const subject = page.locator("[data-subject]");
      await expect(subject).toBeVisible();
      await subject.evaluate(
        (node, c) =>
          Object.assign(node.style, {
            left: `${c.x * c.scale}px`,
            position: "fixed",
            top: `${c.y * c.scale}px`,
          }),
        c
      );
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{visibility:hidden} [data-subject]{visibility:visible}`,
      });
      await page.mouse.move(0, 0);

      if (c.state === "focus") {
        await subject.focus();
      }

      if (c.state === "hover") {
        await subject.hover();
      }

      const expectedBytes = readFileSync(
        pixelPerfectFile(`${directory}/captures/${c.name}`)
      );

      expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
        c.sha256
      );
      const actual = await subject.screenshot();

      const { diff, mismatchedPixels } = compare(
        PNG.sync.read(expectedBytes),
        PNG.sync.read(actual)
      );

      writeFileSync(testInfo.outputPath("actual.png"), actual);
      writeFileSync(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
      writeFileSync(
        testInfo.outputPath("metrics.json"),
        JSON.stringify({
          case: c.name,
          mismatchedPixels,
          tolerance: 0,
          totalPixels: c.width * c.height * c.scale * c.scale,
        })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
});
