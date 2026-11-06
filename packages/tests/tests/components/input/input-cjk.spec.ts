import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";

test("CJK pointer hit-testing uses the original glyph advances", async ({
  page,
}) => {
  for (const [text, advance] of [
    ["你好世界", 9],
    ["こんにちは", 9],
    ["안녕하세요", 8.5],
  ] as const) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await page.goto(`/?${new URLSearchParams({ component: "input", text })}`);
    const input = page.getByRole("textbox", { name: "Test input" });
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await expect(input).toHaveAttribute("data-mc-bitmap", "true");
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await page.evaluate(async () => await document.fonts.ready);
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    const bounds = await input.boundingBox();
    expectNotNull(bounds, "Missing required bounding box: bounds");
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await page.mouse.click(
      bounds.x + (4 + advance * 2) * 2,
      bounds.y + bounds.height / 2
    );
    expect(
      // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
      await input.evaluate((node: HTMLInputElement) => node.selectionStart)
    ).toBe(2);
  }
});
