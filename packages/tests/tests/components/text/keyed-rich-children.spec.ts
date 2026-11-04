import { test, expect } from "@grasscn/tests/test";

for (const adapter of [
  "kbd",
  "code-block",
  "item-text",
  "chat-text",
  "select-value",
] as const) {
  test(`${adapter} keeps caller-keyed child state with its identity after reordering`, async ({
    page,
  }) => {
    await page.goto(`/?component=keyed-rich-children&adapter=${adapter}`);
    const root = page.getByTestId("rich-key-adapter");
    const counters = root.locator("button[data-counter-id]");
    const a = root.getByRole("button", { exact: true, name: "Increment A" });
    const b = root.getByRole("button", { exact: true, name: "Increment B" });

    const swap = page.getByRole("button", {
      exact: true,
      name: "Swap children",
    });

    await expect(counters).toHaveText(["A:0", "B:0"]);
    await a.click();
    await a.click();
    await b.click();
    await expect(counters).toHaveText(["A:2", "B:1"]);
    await swap.click();
    await expect(counters).toHaveText(["B:1", "A:2"]);
    await b.click();
    await b.click();
    await expect(counters).toHaveText(["B:3", "A:2"]);
    await swap.click();
    await expect(counters).toHaveText(["A:2", "B:3"]);
  });
}
