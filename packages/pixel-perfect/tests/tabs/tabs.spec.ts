import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import manifest from "../reference/tabs/manifest.json";

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

test("Tabs comparator catches a one-pixel change", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/tabs/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

test.describe("Tabs native matrix", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of manifest.cases) {
    test(`Tabs native pixels: ${c.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: 900, width: 1536 });
      await page.addInitScript(() => {
        Date.now = () =>
          Number(new URLSearchParams(location.search).get("timeMs") ?? 0);
      });

      const query = new URLSearchParams({
        component: c.element,
        scale: String(c.scale),
        state: c.state,
        timeMs: String(c.timeMs),
        width: String(c.width),
      });

      for (const key of [
        "label",
        "selected",
        "selectedIndex",
        "targetIndex",
        "disabledIndex",
      ] as const) {
        if (c[key] != null) {
          query.set(key, String(c[key]));
        }
      }

      if (c.labels) {
        query.set("labels", JSON.stringify(c.labels));
      }

      await page.goto(`/?${query}`);
      const card = page.locator("[data-subject]");
      await expect(card).toBeVisible();
      await card.evaluate(
        (node, p) =>
          Object.assign(node.style, {
            left: p.x + "px",
            position: "fixed",
            top: p.y + "px",
            visibility: "visible",
            width: p.width + "px",
          }),
        { width: c.width * c.scale, x: c.x * c.scale, y: c.y * c.scale }
      );
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{visibility:hidden} [data-subject]{visibility:visible}`,
      });
      await page.mouse.move(0, 0);

      if (c.element === "tabs-trigger") {
        await expect(card).toHaveAttribute("data-mc-tab-ready", "true");

        if (c.state.endsWith("hover")) {
          await card.hover();
        }

        if (c.state === "focus") {
          await card.focus();
        }
      } else {
        await expect(card).toHaveAttribute("data-mc-tabs-ready", "true");
        const target = card.getByRole("tab").nth(c.targetIndex ?? 0);

        if (c.state === "hover") {
          await target.hover();
        }

        if (c.state === "focus") {
          await target.focus();
        }
      }

      const expectedBytes = await readFile(
        pixelPerfectFile(`tests/reference/tabs/captures/${c.name}`)
      );

      expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
        c.sha256
      );
      const actualBytes = await card.screenshot({ animations: "disabled" });

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
});
