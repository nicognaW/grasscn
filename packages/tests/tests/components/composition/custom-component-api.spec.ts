import { test, expect } from "@grasscn/tests/test";

test("custom component refs reach their DOM roots and preserve native event cancellation", async ({
  page,
}) => {
  await page.goto("/?component=custom-api");
  await page.getByRole("button", { name: "Focus tree by ref" }).click();
  await expect(
    page.getByRole("group", { name: "Advancement tree" })
  ).toBeFocused();
  await page.getByRole("button", { name: "Focus hotbar by ref" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Slot 1" })
  ).toBeFocused();
  await page.getByRole("button", { exact: true, name: "Slot 2" }).click();
  await expect(page.locator("#custom-api-event")).toHaveText("slot:1");
  const map = page.getByRole("group", { exact: true, name: "Map" });
  await map.click({ position: { x: 20, y: 30 } });
  await expect(page.locator("#custom-api-event")).toHaveText("map:10,15");
  await page.getByRole("button", { name: "Toggle cancellation" }).click();
  await page.getByRole("button", { exact: true, name: "Root" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Root" })
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { exact: true, name: "Slot 3" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Slot 2" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { exact: true, name: "Slot 3" }).hover();
  await page.mouse.wheel(0, 100);
  await expect(
    page.getByRole("button", { exact: true, name: "Slot 2" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { exact: true, name: "Next page" }).click();
  await expect(
    page.getByRole("document", { exact: true, name: "Page 1" })
  ).toBeVisible();
  await map.click({ position: { x: 40, y: 60 } });
  await page
    .getByRole("button", { exact: true, name: "Sample player" })
    .click();
  await page.getByRole("button", { exact: true, name: "Second offer" }).click();
  await expect(page.locator("#custom-api-event")).toHaveText("map:10,15");
  await page.getByRole("button", { name: "Toggle cancellation" }).click();
  await page.getByRole("button", { exact: true, name: "Second offer" }).click();
  await expect(page.locator("#custom-api-event")).toHaveText("trade:second");
});
