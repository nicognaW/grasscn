import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";

const preview = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

for (const scale of [2] as const) {
  for (const mobile of [false, true]) {
    for (const route of [
      "calendar",
      "chart",
      "select",
      "date-picker",
    ] as const) {
      test(`Default ${route} Select anchors initially at GUI${scale} ${mobile ? "mobile" : "desktop"}`, async ({
        page,
      }) => {
        const width = mobile ? 390 : 1440;
        const height = mobile ? 844 : 955;

        await page.setViewportSize({ height, width });
        await page.goto(
          `${preview.replace(/\/$/u, "")}/docs/components/${route}`
        );

        if (route === "date-picker") {
          await page
            .locator(".documentation-playground")
            .getByRole("button", { exact: true, name: "Pick a range" })
            .click();
        }

        const triggers =
          route === "date-picker"
            ? page.locator(
                "[data-slot=date-picker-content] [data-slot=select-trigger]"
              )
            : page.locator(
                `[data-stage="${route}"] [data-slot=select-trigger]`
              );

        for (
          let index = 0, count = await triggers.count();
          index < count;
          index += 1
        ) {
          const trigger = triggers.nth(index);
          await expect
            .poll(
              async () =>
                await trigger.evaluate((n) =>
                  getComputedStyle(n).getPropertyValue("--mc-scale").trim()
                )
            )
            .toBe(String(scale));
          await trigger.evaluate((n) => {
            scrollBy(0, n.getBoundingClientRect().top - 160);
          });
          await trigger.click();
          const popup = page.locator("[data-slot=select-content][data-open]");
          await expect(popup).toBeVisible();
          const anchor = await trigger.boundingBox();
expectNotNull(anchor, "Missing required bounding box: anchor");
          await expect
            .poll(async () => {
              const p = await popup.boundingBox();
expectNotNull(p, "Missing required bounding box: p");

              return Math.max(
                p.y - anchor.y - anchor.height,
                anchor.y - p.y - p.height,
                0
              );
            })
            .toBeLessThanOrEqual(8 * scale);

          const itemAligned =
            (await popup.getAttribute("data-align-trigger")) === "true";

          if (itemAligned) {
            const selected = popup.locator("[data-selected]");
            await expect
              .poll(async () => {
                const row = await selected.boundingBox();
expectNotNull(row, "Missing required bounding box: row");

                return Math.abs(
                  row.y + row.height / 2 - anchor.y - anchor.height / 2
                );
              })
              .toBeLessThanOrEqual(scale);
          } else {
            const bounds = await popup.boundingBox();
expectNotNull(bounds, "Missing required bounding box: bounds");
            expect(
              bounds.y >= anchor.y + anchor.height - 1 ||
                bounds.y + bounds.height <= anchor.y + 1
            ).toBe(true);
          }

          const p = await popup.boundingBox();
expectNotNull(p, "Missing required bounding box: p");

          let expectedX = Math.min(
            Math.max(anchor.x, 10),
            width - p.width - 10
          );

          let horizontalRange = 1;

          if (itemAligned) {
            // Base UI aligns the selected text with the value, clamping at its 5px screen inset.
            const value = await trigger
              .locator("[data-slot=select-value]")
              .boundingBox();
expectNotNull(value, "Missing required bounding box: value");

            const text = await popup
              .locator("[data-selected] .mc-select-item-label")
              .boundingBox();
expectNotNull(text, "Missing required bounding box: text");

            expectedX = Math.min(
              Math.max(p.x + value.x - text.x, 5),
              width - p.width - 5
            );
            // The overflowing Minecraft trigger label keeps moving after Base UI snapshots its position.
            // Its full travel is the measured text overflow inside the two-pixel side insets.
            horizontalRange = Math.max(
              1,
              value.width - (anchor.width - 4 * scale)
            );
          }

          expect(Math.abs(p.x - expectedX)).toBeLessThanOrEqual(
            horizontalRange
          );
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x + p.width).toBeLessThanOrEqual(width);
          expect(p.y + p.height).toBeLessThanOrEqual(height);
          await page.keyboard.press("Escape");
          await expect(trigger).toBeFocused();
        }
      });
    }
  }
}

for (const scale of [2] as const) {
  for (const mobile of [false, true]) {
    test(`Platform NativeSelect keeps its original HTML control and CJK value GUI${scale} ${mobile ? "mobile" : "desktop"}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        height: mobile ? 844 : 955,
        width: mobile ? 390 : 1440,
      });
      await page.goto(`${preview.replace(/\/$/u, "")}/#native-select`);
      const select = page.locator("select#native-mode");
      await select.selectOption("world");
      await expect(select).toHaveValue("world");
      await expect(
        page.locator("[data-stage=native-select] .mc-native-select-art").first()
      ).toContainText("\u4e16\u754c");
      // OS-native popup placement is platform-controlled, not a DOM/native-Minecraft popup claim.
      await expect(page.locator("[data-slot=select-content]")).toHaveCount(0);
    });
  }
}
