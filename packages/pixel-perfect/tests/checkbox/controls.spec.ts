import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectRoot, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const manifest = JSON.parse(
  readFileSync(
    pixelPerfectFile("tests/reference/controls/manifest.json"),
    "utf8"
  )
) as {
  cases: {
    name: string;
    element: string;
    state: string;
    checked: boolean;
    scale: number;
    width: number;
    height: number;
    sha256: string;
  }[];
};

function compare(expected: PNG, actual: PNG) {
  if (expected.width !== actual.width || expected.height !== actual.height)
    throw new Error("Pixel dimensions differ");
  const diff = new PNG({ width: expected.width, height: expected.height });
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
            expected.data[i] >> 2,
            expected.data[i + 1] >> 2,
            expected.data[i + 2] >> 2,
            255,
          ],
      i
    );
  }
  return { mismatchedPixels, diff };
}

test("Control comparator detects one changed pixel", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/controls/captures/${manifest.cases[0].name}`
      )
    )
  );
  const actual = PNG.sync.read(PNG.sync.write(expected));
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
      `/?${new URLSearchParams({ component: reference.element, scale: String(reference.scale), state: reference.state, checked: String(reference.checked) })}`
    );
    const subject = page.locator("[data-subject]");
    await expect(subject).toBeVisible();
    await page.mouse.move(0, 0);
    if (reference.state === "hover") await subject.hover();
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
          totalPixels: expected.width * expected.height,
          tolerance: 0,
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
