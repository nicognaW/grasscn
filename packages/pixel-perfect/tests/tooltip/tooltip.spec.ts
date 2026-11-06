import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import manifest from "../reference/tooltip/manifest.json";

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

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

test("Tooltip comparator detects one changed pixel", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/tooltip/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const c of manifest.cases) {
  test(`Tooltip native pixels: ${c.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.goto(
      `/?${new URLSearchParams({ component: "tooltip", open: "1", scale: String(c.scale), text: c.text, wrapWidth: String(c.wrapWidth) })}`
    );
    await page.addStyleTag({
      content: `html,body { background: ${c.background}; } #root { visibility: hidden; } [data-mc-positioner] { transform: translate(${c.x * c.scale}px, ${c.y * c.scale}px) !important; }`,
    });
    const content = page.locator('[data-slot="tooltip-content"]');
    await expect(content).toBeVisible();
    await expect(content.locator("canvas")).toHaveAttribute(
      "data-mc-tooltip-painted",
      "true"
    );
    await expect(content.locator("canvas")).toHaveAttribute(
      "data-mc-backdrop",
      [1, 3, 5]
        .map((start) =>
          Number.parseInt(c.background.slice(start, start + 2), 16)
        )
        .join(",")
    );
    await expect(content.locator("canvas")).toHaveAttribute(
      "data-mc-location",
      [c.x * c.scale, c.y * c.scale].join(",")
    );
    await page.mouse.move(0, 0);

    const expectedBytes = await readFile(
      pixelPerfectFile(`tests/reference/tooltip/captures/${c.name}`)
    );

    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      c.sha256
    );
    const actualBytes = await content.screenshot({ animations: "disabled" });

    const { diff, mismatchedPixels } = compare(
      PNG.sync.read(expectedBytes),
      PNG.sync.read(actualBytes)
    );

    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify(
        {
          case: c.name,
          mismatchedPixels,
          tolerance: 0,
          totalPixels: c.width * c.height * c.scale * c.scale,
        },
        null,
        2
      )
    );
    expect(mismatchedPixels).toBe(0);
  });
}
