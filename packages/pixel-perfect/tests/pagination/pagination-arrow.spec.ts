import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type paginationArrowReference from "../reference/pagination-arrow/manifest.json";

const directory = "tests/reference/pagination-arrow";

// SAFETY: this fixed read consumes the retained pagination-arrow manifest represented by the exact type-only JSON import; its case-definition and capture-source hashes match the retained producers. Keep the existing fresh read and parse phase.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained-manifest contract at JSON.parse; no runtime loader, validation or generic caster.
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as typeof paginationArrowReference;

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

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

test("Pagination arrow comparator rejects one changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

test.describe("Pagination native recipe-book page arrows", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of manifest.cases) {
    test(`Pagination arrow pixels: ${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const params = new URLSearchParams({
        background: c.background,
        checked: String(c.checked),
        component: "pagination",
        native: "1",
        part: "arrow",
        scale: String(c.scale),
        state: c.state,
        x: String(c.x),
        y: String(c.y),
      });

      await page.goto(`/?${params}`);
      const subject = page.locator("[data-subject]");
      await expect(subject).toHaveAttribute(
        "data-slot",
        c.checked ? "pagination-next" : "pagination-previous"
      );
      await page.mouse.move(0, 0);

      if (c.state.endsWith("hover")) {
        await subject.hover();
      }

      if (c.state === "focus") {
        await subject.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        await expect(subject).toBeFocused();
      }

      await page.evaluate(async () => {
        const frameCompletion = Promise.withResolvers<void>();

        try {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              frameCompletion.resolve();
            });
          });
        } catch (error) {
          frameCompletion.reject(error);
        }

        await frameCompletion.promise;
      });

      const expectedBytes = readFileSync(
        pixelPerfectFile(`${directory}/captures/${c.name}`)
      );

      expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
        c.sha256
      );

      const actualBytes = await subject.screenshot();
      const expected = PNG.sync.read(expectedBytes);
      const actual = PNG.sync.read(actualBytes);
      const { mismatchedPixels, diff } = compare(expected, actual);

      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({ case: c.name, mismatchedPixels, tolerance: 0 })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
});
