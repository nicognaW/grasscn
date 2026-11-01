import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectRoot, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";
const directory = "tests/reference/toast",
  manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf8")
  );
function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ width: expected.width, height: expected.height });
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
  return { mismatchedPixels, diff };
}
for (const component of ["sonner"]) {
  test(`${component} pixel comparator catches a changed pixel`, () => {
    const expected = PNG.sync.read(
        readFileSync(
          pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
        )
      ),
      actual = PNG.sync.read(PNG.sync.write(expected));
    actual.data[0] ^= 1;
    expect(compare(expected, actual).mismatchedPixels).toBe(1);
  });
  test.describe(`${component} native SystemToast frames`, () => {
    test.describe.configure({ mode: "parallel" });
    for (const c of manifest.cases)
      test(`${component} original frame: ${c.name}`, async ({ page }, info) => {
        await page.setViewportSize({ width: 1536, height: 900 });
        await page.clock.install({ time: new Date("2026-10-30T00:00:00Z") });
        await page.clock.pauseAt(new Date("2026-10-30T00:00:01Z"));
        const q = new URLSearchParams({
          component,
          native: "1",
          label: c.label,
          width: String(c.width),
          height: String(c.height),
          scale: String(c.scale),
          background: c.background,
          x: String(c.x),
          y: String(c.y),
          count: String(c.selectedIndex ?? 1),
        });
        if (c.text != null) q.set("text", c.text);
        await page.goto(`/?${q}`);
        if (component === "sonner")
          await expect(page.locator("#created")).toHaveText(
            String(c.selectedIndex ?? 1)
          );
        await page.clock.fastForward(0);
        await page.addStyleTag({
          content:
            "#root{visibility:hidden}[data-subject],[data-sonner-toast],[data-mc-sonner-ghost]{visibility:visible}",
        });
        const subject = page.locator("[data-subject]");
        await expect(subject).toBeVisible();
        await expect(
          page.locator(
            component === "sonner"
              ? "[data-sonner-toast]"
              : '[data-slot="toast"]'
          )
        ).toHaveCount(c.selectedIndex ?? 1);
        await expect(page.locator("[data-mc-toast-ready]")).toHaveCount(
          c.selectedIndex ?? 1
        );
        for (const canvas of await page.locator("[data-mc-toast-ready]").all())
          await expect(canvas).toHaveAttribute("data-mc-toast-ready", "true");
        if (c.state === "exiting") {
          await page.clock.fastForward(600);
          await page
            .locator("#close")
            .evaluate((node) => (node as HTMLElement).click());
          await page.clock.fastForward(component === "sonner" ? 16 : 0);
          await expect(
            page
              .locator(
                component === "sonner"
                  ? "[data-sonner-toast]"
                  : '[data-slot="toast"]'
              )
              .first()
          ).toHaveAttribute(
            component === "sonner" ? "data-removed" : "data-state",
            component === "sonner" ? "true" : "closed"
          );
        }
        await page.clock.fastForward(c.timeMs);
        if (c.state !== "exiting" || c.timeMs < 600) {
          await expect(page.locator("[data-mc-toast-ready]")).toHaveCount(
            c.selectedIndex ?? 1
          );
          for (const canvas of await page
            .locator("[data-mc-toast-ready]")
            .all())
            await expect(canvas).toHaveAttribute("data-mc-toast-ready", "true");
        }
        await page.evaluate(() => window.dispatchEvent(new Event("resize")));
        const bytes = readFileSync(
          pixelPerfectFile(`${directory}/captures/${c.name}`)
        );
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
        const actual = await subject.screenshot({ animations: "disabled" }),
          { mismatchedPixels, diff } = compare(
            PNG.sync.read(bytes),
            PNG.sync.read(actual)
          );
        writeFileSync(info.outputPath("actual.png"), actual);
        writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
        writeFileSync(
          info.outputPath("metrics.json"),
          JSON.stringify({
            case: c.name,
            component,
            state: c.state,
            timeMs: c.timeMs,
            mismatchedPixels,
            totalPixels: c.width * c.height * c.scale * c.scale,
            tolerance: 0,
          })
        );
        expect(mismatchedPixels).toBe(0);
      });
  });
}
