import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

for (const [part, dir] of [
  ["row", "item"],
  ["action", "."],
  ["action", "button-cjk"],
]) {
  const manifest = JSON.parse(
    readFileSync(
      pixelPerfectFile(`tests/reference/${dir}/manifest.json`),
      "utf-8"
    )
  );

  test.describe(`Attachment actual native ${part} constituents ${dir}`, () => {
    test.describe.configure({ mode: "parallel" });

    for (const c of manifest.cases) {
      test(c.name, async ({ page }, info) => {
        await page.setViewportSize({ height: 900, width: 1536 });

        const q = new URLSearchParams({
          background: c.background ?? manifest.background ?? "#202020",
          component: "attachment",
          description: c.placeholder ?? "Survival Mode",
          height: String(c.height ?? 20),
          label: c.label,
          native: "1",
          part,
          scale: String(c.scale),
          selected: String(c.selected ?? false),
          state: c.state,
          text: c.text ?? "world-1",
          width: String(c.width),
          x: String(c.x ?? 16),
          y: String(c.y ?? 16),
        });

        await page.goto(`/?${q}`);
        const subject = page.locator("[data-subject]");
        await expect(subject).toBeVisible();
        await page.mouse.move(0, 0);

        if (part === "row") {
          await expect(
            subject.locator("[data-slot=attachment-content]")
          ).toHaveAttribute("data-mc-item-content-ready", "true");

          for (const label of await subject
            .locator("[data-mc-label-layout-ready]")
            .all()) {
            await expect(label).toHaveAttribute(
              "data-mc-label-layout-ready",
              "true"
            );
          }

          await expect(
            subject.locator("[data-mc-item-media-ready]")
          ).toHaveAttribute("data-mc-item-media-ready", "true");

          if (c.state === "hover") {
            await subject.hover();
          }

          if (c.state === "icon-hover") {
            const b = (await subject.boundingBox())!;
            await page.mouse.move(b.x + 18 * c.scale, b.y + 18 * c.scale);
          }

          if (c.state === "focus") {
            await subject.focus();
            await page.keyboard.press("Tab");
            await page.keyboard.press("Shift+Tab");
            await expect(subject).toBeFocused();
          }

          await expect(
            subject.locator("[data-mc-item-media-ready]")
          ).toHaveAttribute(
            "data-mc-item-media-state",
            c.state === "hover" ? "1" : c.state === "icon-hover" ? "2" : "0"
          );
        } else {
          if (c.state === "hover") {
            await subject.hover();
          }

          if (c.state === "focus") {
            await subject.focus();
          }
        }

        for (const glyph of await subject
          .locator("[data-mc-label-ready]")
          .all()) {
          await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
        }

        await page.evaluate(
          async () =>
            {
              const frameCompletion = Promise.withResolvers();

              try {
                requestAnimationFrame(() => {
                  requestAnimationFrame(frameCompletion.resolve);
                });
              } catch (error) {
                frameCompletion.reject(error);
              }

              return frameCompletion.promise;
            }
        );

        const bytes = readFileSync(
          pixelPerfectFile(`tests/reference/${dir}/captures/${c.name}`)
        );

        const actualBytes = await subject.screenshot({
          animations: "disabled",
        });

        const a = PNG.sync.read(bytes);
        const b = PNG.sync.read(actualBytes);

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
        expect([b.width, b.height]).toEqual([a.width, a.height]);
        let mismatchedPixels = 0;

        for (let i = 0; i < a.data.length; i += 4) {
          mismatchedPixels += Number(
            !a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))
          );
        }

        writeFileSync(
          info.outputPath("metrics.json"),
          JSON.stringify({
            alias: "base",
            case: c.name,
            component: "attachment",
            manifest:
              dir === "."
                ? "tests/reference/manifest.json"
                : `tests/reference/${dir}/manifest.json`,
            mismatchedPixels,
            part,
            tolerance: 0,
          })
        );
        writeFileSync(info.outputPath("actual.png"), actualBytes);
        expect(mismatchedPixels).toBe(0);
      });
    }
  });
}
