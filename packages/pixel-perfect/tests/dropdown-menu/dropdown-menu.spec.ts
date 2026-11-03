import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type nativeReference from "../reference/suggestions/manifest.json";

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < actual.data.length; i += 4) {
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

const directory = "tests/reference/suggestions";

// SAFETY: these retained native capture producers own this concrete case schema; the existing read/parse phase and verification assertions remain unchanged.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as typeof nativeReference;

test("Menu comparator catches one changed pixel", () => {
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

for (const c of manifest.cases) {
  test(`Dropdown Menu native appearance: ${c.name}`, async ({ page }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });

    const query = new URLSearchParams({
      component: "dropdown-menu",
      height: String(c.height),
      labels: JSON.stringify(c.labels),
      native: "1",
      scale: String(c.scale),
      surface: c.element === "menu-panel" ? "popup" : "suggestions",
      width: String(c.width),
      x: String(c.x),
      y: String(c.y),
    });

    await page.goto(`/?${query}`);
    await page.addStyleTag({
      content: `html,body{background:${c.background}} #root{visibility:hidden}`,
    });
    const subject = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(subject).toHaveAttribute("data-mc-menu-ready", "true");
    await subject.evaluate((node: HTMLElement) => {
      node.focus();
    });

    if (c.selectedIndex >= 0) {
      await subject.getByRole("menuitem").nth(c.selectedIndex).focus();
    }

    if (c.state.endsWith("hover")) {
      await subject
        .getByRole("menuitem")
        .nth(
          // SAFETY: all 24 pinned hover cases have numeric targets; ReferenceSuggestions unboxes targetIndex only when state ends with hover.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          (c as typeof c & { targetIndex: number }).targetIndex
        )
        .hover();
    } else {
      await page.mouse.move(0, 0);
    }

    await subject.evaluate(
      (node, value) => {
        node.scrollTop = value;
      },
      (c.value ?? 0) * 12 * c.scale
    );
    await expect(
      subject.locator('[data-mc-menu-text-ready="false"]')
    ).toHaveCount(0);

    for (const line of await subject
      .locator("[data-mc-menu-unicode-ready]")
      .all()) {
      await expect(line).toHaveAttribute("data-mc-menu-unicode-ready", "true");
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

      return frameCompletion.promise;
    });
    const bounds = (await subject.boundingBox());
    expect(bounds.x).toBe(c.x * c.scale);
    expect(bounds.y).toBe(c.y * c.scale);

    const bytes = readFileSync(
      pixelPerfectFile(`${directory}/captures/${c.name}`)
    );

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

    const actual = await subject.screenshot();

    const { mismatchedPixels, diff } = compare(
      PNG.sync.read(bytes),
      PNG.sync.read(actual)
    );

    writeFileSync(info.outputPath("actual.png"), actual);
    writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
    writeFileSync(
      info.outputPath("metrics.json"),
      JSON.stringify({ case: c.name, mismatchedPixels, tolerance: 0 })
    );
    expect(mismatchedPixels).toBe(0);
  });
}
