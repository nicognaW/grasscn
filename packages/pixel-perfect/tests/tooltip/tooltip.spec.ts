import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";

const manifest = JSON.parse(
  readFileSync(
    resolveRepositoryPath(
      "tests/reference/tooltip/manifest.json",
      pixelPerfectRoot
    ),
    "utf8"
  )
) as {
  cases: {
    name: string;
    text: string;
    wrapWidth: number;
    background: string;
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    renderedLines: string[];
    sha256: string;
  }[];
};

function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ width: expected.width, height: expected.height });
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
            expected.data[i] >> 2,
            expected.data[i + 1] >> 2,
            expected.data[i + 2] >> 2,
            255,
          ],
      i
    );
  }
  return { diff, mismatchedPixels };
}

test("Tooltip comparator detects one changed pixel", async () => {
  const expected = PNG.sync.read(
    await readFile(
      resolveRepositoryPath(
        `tests/reference/tooltip/captures/${manifest.cases[0].name}`,
        pixelPerfectRoot
      )
    )
  );
  const actual = PNG.sync.read(PNG.sync.write(expected));
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const c of manifest.cases)
  test(`Tooltip native pixels: ${c.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto(
      `/?${new URLSearchParams({ component: "tooltip", open: "1", text: c.text, wrapWidth: String(c.wrapWidth), scale: String(c.scale) })}`
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
        .map((start) => parseInt(c.background.slice(start, start + 2), 16))
        .join(",")
    );
    await expect(content.locator("canvas")).toHaveAttribute(
      "data-mc-location",
      [c.x * c.scale, c.y * c.scale].join(",")
    );
    await page.mouse.move(0, 0);
    const expectedBytes = await readFile(
      resolveRepositoryPath(
        `tests/reference/tooltip/captures/${c.name}`,
        pixelPerfectRoot
      )
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
          totalPixels: c.width * c.height * c.scale * c.scale,
          tolerance: 0,
        },
        null,
        2
      )
    );
    expect(mismatchedPixels).toBe(0);
  });
