import { test, expect } from "@grasscn/tests/test";

test("CJK pointer hit-testing uses the original glyph advances", async ({
  page,
}) => {
  for (const [text, advance] of [
    ["你好世界", 9],
    ["こんにちは", 9],
    ["안녕하세요", 8.5],
  ] as const) {
    await page.goto(`/?${new URLSearchParams({ component: "input", text })}`);
    const input = page.getByRole("textbox", { name: "Test input" });
    await expect(input).toHaveAttribute("data-mc-bitmap", "true");
    await page.evaluate(async () => await document.fonts.ready);
    const bounds = (await input.boundingBox())!;
    await page.mouse.click(
      bounds.x + (4 + advance * 2) * 2,
      bounds.y + bounds.height / 2
    );
    expect(
      await input.evaluate((node: HTMLInputElement) => node.selectionStart)
    ).toBe(2);
  }
});
