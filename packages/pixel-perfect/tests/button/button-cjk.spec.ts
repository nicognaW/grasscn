import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const manifest = JSON.parse(
  readFileSync(
    pixelPerfectFile("tests/reference/button-cjk/manifest.json"),
    "utf-8"
  )
) as {
  cases: {
    name: string;
    label: string;
    state: string;
    width: number;
    height: number;
    scale: number;
    x: number;
    y: number;
    sha256: string;
  }[];
};

function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < expected.data.length; i += 4) {
    const different = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(different);
    diff.data.set(
      different
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
}

test("CJK Button comparator catches one changed pixel", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/button-cjk/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const c of manifest.cases) {
  test(`CJK Button native pixels: ${c.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.goto(
      `/?${new URLSearchParams({ component: "button", label: c.label, scale: String(c.scale), state: c.state, width: String(c.width) })}`
    );
    await page.addStyleTag({
      content: "#root > :not([data-subject]) { visibility: hidden; }",
    });
    const button = page.locator("[data-subject]");
    await button.evaluate(
      (node, position) => {
        Object.assign((node as HTMLElement).style, {
          left: `${position.x}px`,
          position: "fixed",
          top: `${position.y}px`,
        });
      },
      { x: c.x * c.scale, y: c.y * c.scale }
    );
    await page.mouse.move(0, 0);

    if (c.state === "hover") {
      await button.hover();
    }

    if (c.state === "focus") {
      await page.keyboard.press("Tab");
      await expect(button).toBeFocused();
    }

    await expect(button.locator("[data-mc-label-ready]")).toHaveAttribute(
      "data-mc-label-ready",
      "true"
    );

    const expectedBytes = await readFile(
      pixelPerfectFile(`tests/reference/button-cjk/captures/${c.name}`)
    );

    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      c.sha256
    );

    const actualBytes = await button.screenshot({ animations: "disabled" });
    const actual = PNG.sync.read(actualBytes);
    const expected = PNG.sync.read(expectedBytes);

    const { diff, mismatchedPixels } = compare(expected, actual);
    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify({ case: c.name, mismatchedPixels, tolerance: 0 }, null, 2)
    );
    expect(mismatchedPixels).toBe(0);
  });
}
