import { test, expect } from "@grasscn/tests/test";
const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/, "/");
for (const scale of [2])
  for (const width of [390, 1440])
    test(`Advancement Badge compact/CJK/link/state at ${width} GUI${scale}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin + "docs/components/badge");
      const stage = page.locator('[data-stage="badge"]'),
        badge = stage.locator('[data-slot="badge"]').first();
      expect((await badge.boundingBox())!.height).toBe(26 * scale);
      await page.getByLabel("Badge text").fill("挑战完成！");
      await expect(
        badge.locator('[data-mc-label-layout-ready="false"]')
      ).toHaveCount(0);
      await expect(badge).toContainText("挑战完成！");
      await page
        .getByRole("button", { name: "Reset challenge", exact: true })
        .click();
      await expect(badge).toHaveAttribute("data-earned", "false");
      const link = page.getByRole("link", {
        name: "View recipes",
        exact: true,
      });
      await link.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(link).toBeFocused();
      expect(
        await link.evaluate((node) => getComputedStyle(node).outlineStyle)
      ).toBe("solid");
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Badge link activations")).toHaveText(
        "Opened 1 times"
      );
      await page
        .getByLabel("Badge text")
        .fill("A long advancement title ".repeat(8));
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        )
        .toBe(true);
    });
