import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import manifest from "../reference/controls/manifest.json";

const compare = function compare(expected: PNG, actual: PNG) {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error("Pixel dimensions differ");
  }

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

test("Control comparator detects one changed pixel", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/controls/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const reference of manifest.cases) {
  test(`Control native pixels: ${reference.name}`, async ({
    page,
  }, testInfo) => {
    const bytes = await readFile(
      pixelPerfectFile(`tests/reference/controls/captures/${reference.name}`)
    );

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      reference.sha256
    );
    await page.goto(
      `/?${new URLSearchParams({ checked: String(reference.checked), component: reference.element, scale: String(reference.scale), state: reference.state })}`
    );
    const subject = page.locator("[data-subject]");
    await expect(subject).toBeVisible();
    await page.mouse.move(0, 0);

    if (reference.state === "hover") {
      await subject.hover();
    }

    if (reference.state === "focus") {
      await page.keyboard.press("Tab");
      await expect(subject).toBeFocused();
    }

    const actualBytes = await subject.screenshot({ animations: "disabled" });
    const expected = PNG.sync.read(bytes);
    const actual = PNG.sync.read(actualBytes);
    expect([actual.width, actual.height]).toEqual([
      reference.width * reference.scale,
      reference.height * reference.scale,
    ]);
    const { mismatchedPixels, diff } = compare(expected, actual);
    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify(
        {
          case: reference.name,
          mismatchedPixels,
          tolerance: 0,
          totalPixels: expected.width * expected.height,
        },
        null,
        2
      )
    );
    expect(
      mismatchedPixels,
      "Exact match against independent vanilla rendering"
    ).toBe(0);
  });
}
