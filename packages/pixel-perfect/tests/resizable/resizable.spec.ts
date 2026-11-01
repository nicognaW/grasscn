import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const arrowManifest = JSON.parse(
  readFileSync(
    pixelPerfectFile("tests/reference/pagination-arrow/manifest.json"),
    "utf-8"
  )
);

for (const c of arrowManifest.cases) {
  test(`Resizable original arrow constituent ${c.name}`, async ({
    page,
  }, info) => {
    const params = new URLSearchParams({
      background: c.background,
      component: "resizable",
      scale: String(c.scale),
    });

    if (c.state.startsWith("disabled")) {
      params.set("disabled", "1");
    }

    await page.goto(`/?${params}`);
    const handle = page.getByRole("separator", { name: "Resize panels" });
    await page.mouse.move(0, 0);

    if (c.state.endsWith("hover")) {
      await handle.hover();
    } else if (c.state === "focus") {
      await handle.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
    }

    const arrow = handle.locator(
      `[data-slot="resizable-arrow"][data-direction="${c.checked ? "forward" : "backward"}"]`
    );

    const bytes = await arrow.screenshot();
    const actual = PNG.sync.read(bytes);

    const expectedBytes = readFileSync(
      pixelPerfectFile(`tests/reference/pagination-arrow/captures/${c.name}`)
    );

    const expected = PNG.sync.read(expectedBytes);

    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      c.sha256
    );
    writeFileSync(info.outputPath("actual.png"), bytes);
    writeFileSync(
      info.outputPath("metrics.json"),
      JSON.stringify({
        alias: "base",
        case: c.name,
        component: "resizable",
        manifest: "tests/reference/pagination-arrow/manifest.json",
        part: c.checked ? "forward-arrow" : "backward-arrow",
      })
    );
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    expect(actual.data.equals(expected.data)).toBe(true);
  });
}
