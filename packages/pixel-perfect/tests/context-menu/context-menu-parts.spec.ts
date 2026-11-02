import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type nativeReference from "../reference/menu-parts/manifest.json";


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

const directory = "tests/reference/menu-parts";

// SAFETY: these retained native capture producers own this concrete case schema; the existing read/parse phase and verification assertions remain unchanged.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as typeof nativeReference;

for (const c of manifest.cases) {
  for (const kind of c.element === "menu-checkbox"
    ? ["menu-checkbox", "menu-radio"]
    : [c.element]) {
    test(`Context Menu slot pixels: ${c.name} ${kind}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1536, height: 900 });

      const query = new URLSearchParams({
        component: "context-menu",
        native: "1",
        part: kind,
        label: c.label ?? "",
        labels: JSON.stringify(c.labels ?? []),
        checked: String(c.checked ?? false),
        state: c.state,
        scale: String(c.scale),
        width: String(c.width),
        height: String(c.height),
        x: String(c.x),
        y: String(c.y),
        surface: c.element === "suggestion-list" ? "suggestions" : "popup",
      });

      await page.goto(`/?${query}`);
      await expect(page.locator("#context-hit")).toBeVisible();
      await page.mouse.click(c.x * c.scale, c.y * c.scale, { button: "right" });
      await page.locator('[data-slot="context-menu-content"]').waitFor();
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{visibility:hidden}`,
      });
      const subject = page.locator('[data-slot="context-menu-content"]');
      await expect(subject).toHaveAttribute("data-mc-menu-ready", "true");
      await page.mouse.move(0, 0);
      await subject.evaluate((node) => {
        (node as HTMLElement).focus();
      });

      if (c.state === "focus") {
        await subject
          .locator(
            '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]'
          )
          .first()
          .focus();
      }

      await page.mouse.move(0, 0);
      await expect(
        subject.locator('[data-mc-menu-text-ready="false"]')
      ).toHaveCount(0);

      for (const line of await subject
        .locator("[data-mc-menu-unicode-ready]")
        .all()) {
        await expect(line).toHaveAttribute(
          "data-mc-menu-unicode-ready",
          "true"
        );
      }

      await page.evaluate(
        async () =>
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                resolve();
              })
            )
          )
      );
      const bounds = (await subject.boundingBox())!;
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
        JSON.stringify({ case: c.name, kind, mismatchedPixels, tolerance: 0 })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
}
