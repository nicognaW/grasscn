import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";

const preview = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

for (const scale of [2] as const) {
  for (const [device, width, height] of [
    ["desktop", 1440, 955],
    ["mobile", 390, 844],
    ["short mobile", 390, 300],
  ] as const) {
    test(`Original F3 charts stay visible and analytics selector stays on screen at GUI${scale} ${device}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height, width });
      await page.goto(`${preview.replace(/\/$/u, "")}/docs/components/chart`);

      const native = page.locator("[data-chart-native-examples]");
      const fps = native.locator("[data-native-chart=fps]");
      const profiler = native.locator("[data-native-chart=profiler]");

      await expect(fps).toBeVisible();
      await expect(profiler).toBeVisible();
      expect(await native.locator("details").count()).toBe(0);
      expect(
        await native.evaluate(
          (n) =>
            !!(
              // oxlint-disable-next-line no-bitwise -- compareDocumentPosition returns combined DOM position flags; test the FOLLOWING bit while retaining other flags.
              n.compareDocumentPosition(
                document.querySelector('[data-slot="chart-example"]')!
              ) & Node.DOCUMENT_POSITION_FOLLOWING
            )
        )
      ).toBe(true);
      await expect(
        profiler.locator("[data-slot=chart-profiler-frame]")
      ).toHaveAttribute("data-mc-ready", "true");

      const firstFps = await fps.screenshot();
      const firstProfiler = await profiler.screenshot();

      await native
        .getByRole("button", { exact: true, name: "Next sample" })
        .click();
      await expect(page.getByLabel("Chart sample")).toHaveText("Sample 2");
      const awaitedScreenshot1 = await fps.screenshot();
      expect(awaitedScreenshot1.equals(firstFps)).toBe(false);
      const awaitedScreenshot2 = await profiler.screenshot();
      expect(awaitedScreenshot2.equals(firstProfiler)).toBe(false);
      await native
        .getByRole("button", { exact: true, name: "120 FPS cap" })
        .click();
      await expect(
        native.getByRole("button", { exact: true, name: "Unlimited" })
      ).toBeVisible();

      const trigger = page.locator(
        '[data-slot=select-trigger][aria-label="Chart type"]'
      );

      await trigger.evaluate((n) => {
        scrollBy(0, n.getBoundingClientRect().top - 80);
      });
      await trigger.click();
      const popup = page.locator("[data-slot=select-content]");
      await expect(popup).toBeVisible();
      const before = await popup.boundingBox();
expectNotNull(before, "Missing required bounding box: before");
      expect(before.x).toBeGreaterThanOrEqual(0);
      expect(before.x + before.width).toBeLessThanOrEqual(width);
      expect(before.y).toBeGreaterThanOrEqual(0);
      expect(before.y + before.height).toBeLessThanOrEqual(height);
      const viewport = popup.locator("[data-slot=select-viewport]");

      const scroll = await viewport.evaluate((n) => ({
        maximum: n.scrollHeight - n.clientHeight,
        top: n.scrollTop,
      }));

      if (height === 300) {
        expect(scroll.maximum).toBeGreaterThan(0);
      }

      await viewport.hover();
      await page.mouse.wheel(0, scroll.top > 0 ? -150 : 150);

      if (scroll.maximum > 0) {
        await expect
          .poll(async () => await viewport.evaluate((n) => n.scrollTop))
          .not.toBe(scroll.top);
      } else {
        // Base UI may show the entire list when item alignment has enough room.
        for (const option of await popup.getByRole("option").all()) {
          const bounds = await option.boundingBox();
expectNotNull(bounds, "Missing required bounding box: bounds");
          expect(bounds.y).toBeGreaterThanOrEqual(before.y);
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(
            before.y + before.height
          );
        }
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

        await frameCompletion.promise;
      });
      // Item-aligned Base UI lists can expand while scrolling, but must stay in bounds.
      const after = await popup.boundingBox();
expectNotNull(after, "Missing required bounding box: after");
      expect(after.y).toBeGreaterThanOrEqual(0);
      expect(after.y + after.height).toBeLessThanOrEqual(height);
      await page.keyboard.press("End");
      await expect(
        page.getByRole("option", { exact: true, name: "Radial" })
      ).toHaveAttribute("data-highlighted", "");
      await page.keyboard.press("Enter");
      await expect(page.locator("[data-slot=chart-example]")).toHaveAttribute(
        "data-chart-type",
        "radial"
      );
    });
  }
}
