import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type menuParts from "../reference/menu-parts/manifest.json";

// SAFETY: the fixed retained menu-parts manifest owns these separator case fields; keep the original fresh read and missing-result TypeError.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained capture producer boundary; no new validation.
const manifest = JSON.parse(
  readFileSync(
    pixelPerfectFile("tests/reference/menu-parts/manifest.json"),
    "utf-8"
  )
) as typeof menuParts;

for (const component of ["dropdown-menu", "context-menu", "menubar"]) {
  for (const scale of [1, 2, 3]) {
    test(`Native menu separator survives a later generic reset: ${component} ${scale}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const c =
        // SAFETY: The retained menu-parts capture producer supplies the 200-wide normal separator on #202020 at each of GUI scales 1, 2 and 3; preserve its existing four-field selection.
        /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact owned producer/API boundary; no additional runtime guard. */
        manifest.cases.find(
          (menuSeparatorCase) =>
            menuSeparatorCase.element === "menu-separator" &&
            menuSeparatorCase.width === 200 &&
            menuSeparatorCase.background === "#202020" &&
            menuSeparatorCase.scale === scale
        ) as (typeof menuParts)["cases"][number];
      /* oxlint-enable typescript/no-unsafe-type-assertion */

      const params = new URLSearchParams({
        component,
        height: String(c.height),
        native: "1",
        part: "menu-separator",
        scale: String(c.scale),
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      await page.goto(`/?${params}`);

      if (component === "context-menu") {
        await expect(page.locator("#context-hit")).toBeVisible();
        await page.mouse.click(c.x * scale, c.y * scale, { button: "right" });
      }

      const menu = page.locator(`[data-slot="${component}-content"]`);
      await expect(menu).toHaveAttribute("data-mc-menu-ready", "true");
      await page.addStyleTag({
        content: `html,body{background:${c.background}}#root{visibility:hidden}@layer components{.mc-separator{margin:0;}}`,
      });
      await page.mouse.move(0, 0);
      const actualBytes = await menu.screenshot();
      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({
          alias: "late-reset",
          case: c.name,
          component,
          manifest: "tests/reference/menu-parts/manifest.json",
          part: "menu-separator",
        })
      );

      const expected = PNG.sync.read(
        readFileSync(
          pixelPerfectFile(`tests/reference/menu-parts/captures/${c.name}`)
        )
      );

      const actual = PNG.sync.read(actualBytes);

      expect([actual.width, actual.height]).toEqual([
        expected.width,
        expected.height,
      ]);
      expect(
        actual.data.equals(expected.data),
        "Late generic styles must preserve all native separator pixels"
      ).toBe(true);
    });
  }
}
