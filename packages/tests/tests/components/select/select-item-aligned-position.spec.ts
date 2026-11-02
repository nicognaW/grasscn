import { test, expect } from "@grasscn/tests/test";

for (const scale of [1, 2, 3] as const) {
  for (const mobile of [false, true]) {
    test(`Explicit item-aligned mode aligns the selected row GUI${scale} ${mobile ? "mobile" : "desktop"}`, async ({
      page,
    }) => {
      const width = mobile ? 390 : 1536;
      const height = mobile ? 844 : 900;

      await page.setViewportSize({ width, height });

      const labels = Array.from(
        { length: 12 },
        (_, i) => `\u6708\u4efd ${i + 1}`
      );

      await page.goto(
        `/?component=select&scale=${scale}&selectedIndex=9&labels=${encodeURIComponent(JSON.stringify(labels))}`
      );
      const trigger = page.locator("#select-trigger");
      await trigger.evaluate(
        (n, { scale, mobile }) =>
          Object.assign(n.style, {
            position: "fixed",
            left: mobile ? "40px" : "500px",
            top: "300px",
            width: `${Math.min(200 * scale, 300)}px`,
          }),
        { scale, mobile }
      );
      await trigger.click();

      const popup = page.locator("#select-popup");
      const selected = popup.locator("[data-selected]");

      await expect(popup).toHaveAttribute("data-mc-select-ready", "true");
      await expect
        .poll(async () => {
          const row = (await selected.boundingBox())!;
          const anchor = (await trigger.boundingBox())!;

          return Math.abs(
            row.y + row.height / 2 - anchor.y - anchor.height / 2
          );
        })
        .toBeLessThanOrEqual(1);
      const before = (await popup.boundingBox())!;
      expect(before.x).toBeGreaterThanOrEqual(0);
      expect(before.x + before.width).toBeLessThanOrEqual(width);
      expect(before.y).toBeGreaterThanOrEqual(0);
      expect(before.y + before.height).toBeLessThanOrEqual(height);
      const viewport = popup.locator("[data-slot=select-viewport]");
      await viewport.hover();
      await page.mouse.wheel(0, -100);
      await page.evaluate(
        async () =>
          await new Promise<void>((r) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                r();
              });
            });
          })
      );
      const after = (await popup.boundingBox())!;
      expect(after.x).toBeGreaterThanOrEqual(0);
      expect(after.y).toBeGreaterThanOrEqual(0);
      expect(after.x + after.width).toBeLessThanOrEqual(width);
      expect(after.y + after.height).toBeLessThanOrEqual(height);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    });
  }
}
