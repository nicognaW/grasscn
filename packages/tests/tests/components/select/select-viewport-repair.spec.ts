import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";

const preview = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

for (const scale of [2] as const) {
  for (const position of ["default", "popper"] as const) {
    for (const short of [false, true]) {
      test(`Select ${position} remains anchored during wheel scrolling GUI${scale} ${short ? "short" : "scrolled"}`, async ({
        page,
      }) => {
        const width = 390;
        const height = short ? 280 : 844;

        await page.setViewportSize({ height, width });
        await page.goto(
          `${preview.replace(/\/$/u, "")}/docs/components/${position === "default" ? "chart" : "select"}`
        );

        const trigger = page.locator(
          `[data-slot=select-trigger][aria-label="${position === "default" ? "Chart type" : "Demo game mode"}"]`
        );

        await expect
          .poll(
            async () =>
              await trigger.evaluate((n) =>
                getComputedStyle(n).getPropertyValue("--mc-scale").trim()
              )
          )
          .toBe(String(scale));
        await trigger.evaluate((n) => {
          scrollBy(0, n.getBoundingClientRect().top - 80);
        });
        await trigger.click();
        const popup = page.locator("[data-slot=select-content]");
        await expect(popup).toBeVisible();
        await expect(popup).toHaveAttribute("data-mc-select-ready", "true");

        const before = await popup.boundingBox();
        expectNotNull(before, "Missing required bounding box: before");
        const anchor = await trigger.boundingBox();
        expectNotNull(anchor, "Missing required bounding box: anchor");

        expect(before.x).toBeGreaterThanOrEqual(0);
        expect(before.x + before.width).toBeLessThanOrEqual(width);
        expect(before.y).toBeGreaterThanOrEqual(0);
        expect(before.y + before.height).toBeLessThanOrEqual(height);
        expect(before.width % scale).toBe(0);
        expect(before.height % scale).toBe(0);
        const viewport = popup.locator("[data-slot=select-viewport]");

        const scroll = await viewport.evaluate((n) => ({
          top: n.scrollTop,
          maximum: n.scrollHeight - n.clientHeight,
        }));

        if (short) {
          expect(scroll.maximum).toBeGreaterThan(0);
        }

        await viewport.hover();
        await page.mouse.wheel(0, scroll.top > 0 ? -1000 : 1000);

        if (scroll.maximum > 0) {
          await expect
            .poll(async () => await viewport.evaluate((n) => n.scrollTop))
            .not.toBe(scroll.top);
        } else {
          await expect
            .poll(async () => await viewport.evaluate((n) => n.scrollTop))
            .toBe(0);
        }

        await page.evaluate(async () => {
          const frameCompletion: PromiseWithResolvers<void> =
            Promise.withResolvers();

          try {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                frameCompletion.resolve();
              });
            });
          } catch (error) {
            frameCompletion.reject(error);
          }

          return await frameCompletion.promise;
        });
        const after = await popup.boundingBox();
        expectNotNull(after, "Missing required bounding box: after");

        if ((await popup.getAttribute("data-align-trigger")) !== "true") {
          expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(scale);
        }

        expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(scale);
        expect(after.y).toBeGreaterThanOrEqual(0);
        expect(after.y + after.height).toBeLessThanOrEqual(height);
        expect(
          Math.max(
            after.y - anchor.y - anchor.height,
            anchor.y - after.y - after.height,
            0
          )
        ).toBeLessThanOrEqual(10 * scale);

        const row = await popup
          .locator("[data-slot=select-item]")
          .last()
          .boundingBox();

        const bar = popup.locator(".mc-select-scrollbar");

        expect(row!.width).toBe(
          Math.min(270, before.width / scale - 30) * scale
        );

        const settledMaximum = await viewport.evaluate(
          (n) => n.scrollHeight - n.clientHeight
        );

        await expect(popup).toHaveAttribute(
          "data-mc-select-scrollable",
          String(settledMaximum > 0)
        );

        if (settledMaximum > 0) {
          const bounds = await bar.boundingBox();
          expectNotNull(bounds, "Missing required bounding box: bounds");
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(
            after.x + after.width
          );
        } else {
          await expect(bar).toBeHidden();
        }

        await page.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
      });
    }
  }
}
