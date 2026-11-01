import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile("tests/reference/manifest.json"), "utf-8")
);

for (const mode of ["split", "fragments", "empty", "numeric"]) {
  for (const c of manifest.cases.filter(
    (c: { width: number; label: string }) =>
      mode === "numeric"
        ? c.width === 103 && c.label.endsWith("09")
        : c.width === 200 && c.label === "Button"
  )) {
    test(`Button${mode}composed native label:${c.name}`, async ({
      page,
    }, info) => {
      const params = new URLSearchParams({
        component: "button-composition",
        composition: mode,
        label: c.label,
        width: String(c.width),
        scale: String(c.scale),
        state: c.state,
      });

      await page.goto(`/?${params}`);
      const button = page.locator("[data-subject]");
      await page.mouse.move(0, 0);

      if (c.state === "hover") await button.hover();

      if (c.state === "focus") {
        await button.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
      }

      const actualBytes = await button.screenshot();
      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({
          component: "button",
          manifest: "tests/reference/manifest.json",
          case: c.name,
          part: "label",
          alias: mode,
        })
      );

      const actual = PNG.sync.read(actualBytes),
        expected = PNG.sync.read(
          readFileSync(pixelPerfectFile(`tests/reference/captures/${c.name}`))
        );

      expect([actual.width, actual.height]).toEqual([
        expected.width,
        expected.height,
      ]);
      expect(actual.data.equals(expected.data)).toBe(true);
    });
  }
}

const cjk = JSON.parse(
  readFileSync(
    pixelPerfectFile("tests/reference/button-cjk/manifest.json"),
    "utf-8"
  )
);

for (const mode of ["split", "fragments", "empty"]) {
  for (const c of cjk.cases) {
    test(`Button ${mode} CJK runs: ${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({ width: 1536, height: 900 });

      const params = new URLSearchParams({
        component: "button-composition",
        composition: mode,
        label: c.label,
        width: String(c.width),
        scale: String(c.scale),
        state: c.state,
        x: String(c.x ?? 16),
        y: String(c.y ?? 16),
      });

      await page.goto(`/?${params}`);
      const button = page.locator("[data-subject]");
      await page.mouse.move(0, 0);

      if (c.state === "hover") await button.hover();

      if (c.state === "focus") {
        await button.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
      }

      await expect(button.locator("[data-mc-label-ready]")).toHaveAttribute(
        "data-mc-label-ready",
        "true",
        { timeout: 15_000 }
      );
      const actualBytes = await button.screenshot();
      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({
          component: "button",
          manifest: "tests/reference/button-cjk/manifest.json",
          case: c.name,
          part: "label",
          alias: mode,
        })
      );

      const a = PNG.sync.read(actualBytes),
        e = PNG.sync.read(
          readFileSync(
            pixelPerfectFile(`tests/reference/button-cjk/captures/${c.name}`)
          )
        );

      expect([a.width, a.height]).toEqual([e.width, e.height]);
      expect(a.data.equals(e.data)).toBe(true);
    });
  }
}
