import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";
const manifest = JSON.parse(
  readFileSync(
    resolveRepositoryPath(
      "tests/reference/tabs/manifest.json",
      pixelPerfectRoot
    ),
    "utf8"
  )
) as {
  cases: {
    name: string;
    width: number;
    height: number;
    scale: number;
    background: string;
    element: string;
    label?: string;
    labels?: string[];
    selected?: boolean;
    selectedIndex?: number;
    targetIndex?: number;
    disabledIndex?: number;
    timeMs: number;
    state: string;
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
test("Tabs comparator catches a one-pixel change", async () => {
  const expected = PNG.sync.read(
    await readFile(
      resolveRepositoryPath(
        `tests/reference/tabs/captures/${manifest.cases[0].name}`,
        pixelPerfectRoot
      )
    )
  );
  const actual = PNG.sync.read(PNG.sync.write(expected));
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});
test.describe("Tabs native matrix", () => {
  test.describe.configure({ mode: "parallel" });
  for (const c of manifest.cases)
    test(`Tabs native pixels: ${c.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1536, height: 900 });
      await page.addInitScript(() => {
        Date.now = () =>
          Number(new URLSearchParams(location.search).get("timeMs") ?? 0);
      });
      const query = new URLSearchParams({
        component: c.element,
        width: String(c.width),
        scale: String(c.scale),
        state: c.state,
        timeMs: String(c.timeMs),
      });
      for (const key of [
        "label",
        "selected",
        "selectedIndex",
        "targetIndex",
        "disabledIndex",
      ] as const)
        if (c[key] != null) query.set(key, String(c[key]));
      if (c.labels) query.set("labels", JSON.stringify(c.labels));
      await page.goto(`/?${query}`);
      const card = page.locator("[data-subject]");
      await expect(card).toBeVisible();
      await card.evaluate(
        (node, p) =>
          Object.assign(node.style, {
            position: "fixed",
            left: p.x + "px",
            top: p.y + "px",
            width: p.width + "px",
            visibility: "visible",
          }),
        { x: c.x * c.scale, y: c.y * c.scale, width: c.width * c.scale }
      );
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{visibility:hidden} [data-subject]{visibility:visible}`,
      });
      await page.mouse.move(0, 0);
      if (c.element === "tabs-trigger") {
        await expect(card).toHaveAttribute("data-mc-tab-ready", "true");
        if (c.state.endsWith("hover")) await card.hover();
        if (c.state === "focus") await card.focus();
      } else {
        await expect(card).toHaveAttribute("data-mc-tabs-ready", "true");
        const target = card.getByRole("tab").nth(c.targetIndex ?? 0);
        if (c.state === "hover") await target.hover();
        if (c.state === "focus") await target.focus();
      }
      const expectedBytes = await readFile(
        resolveRepositoryPath(
          `tests/reference/tabs/captures/${c.name}`,
          pixelPerfectRoot
        )
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
            totalPixels: c.width * c.height * c.scale * c.scale,
            tolerance: 0,
          },
          null,
          2
        )
      );
      expect(mismatchedPixels).toBe(0);
    });
});
