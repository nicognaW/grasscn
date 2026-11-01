import { test, expect } from "@grasscn/tests/test";
import { documentationInventory } from "@tests/checks/documentation-inventory.mjs";
const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/, "/");
test("canonical documentation independently exposes grouped public parts and omits discarded controls", async ({
  page,
}) => {
  const inventory = documentationInventory();
  expect(inventory.pages.map((item) => item.name)).not.toContain("skeleton");
  for (const [name, title, owner] of [
    ["field", "Field", "form"],
    ["bubble", "Bubble", "message"],
    ["message-scroller", "Message Scroller", "message"],
  ]) {
    expect(
      inventory.pages.find((item) => item.name === name)?.registryItem
    ).toBe(owner);
    expect(inventory.items).not.toContain(name);
    await page.goto(origin + "docs/components/" + name);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(
      page.getByRole("heading", { name: "Installation", exact: true })
    ).toBeVisible();
  }
  await page.goto(origin + "docs/components/avatar");
  await expect(page.getByRole("group", { name: "Preview scale" })).toHaveCount(
    0
  );
  await expect(page.getByRole("button", { name: /Hat:/ })).toHaveCount(0);
  await expect(
    page.locator('.documentation-playground [data-stage="avatar"]')
  ).toContainText("Jordan Lee");
  await expect(
    page.getByRole("contentinfo").getByRole("navigation")
  ).toHaveCount(0);
  await page.goto(origin);
  await expect(page.locator("body")).not.toContainText(
    "A little nostalgia. A lot to build."
  );
  await expect(page.locator("body")).not.toContainText("Real game assets");
});
for (const width of [320, 1440])
  test(`sidebar remains visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + "docs/components/sidebar");
    const stage = page.locator(
      '.documentation-playground [data-stage="sidebar"]'
    );
    await expect(stage.locator('[data-slot="sidebar"]')).toHaveAttribute(
      "data-collapsible",
      "none"
    );
    await expect(
      stage.locator('[data-slot="sidebar-trigger"],[data-slot="sidebar-rail"]')
    ).toHaveCount(0);
    await stage
      .getByRole("textbox", { name: "Find sidebar worlds" })
      .fill("Creative");
    await stage.getByRole("button", { name: "Creative", exact: true }).click();
    await expect(page.getByLabel("Sidebar selection")).toHaveText("Creative");
    await page.keyboard.press("Control+b");
    await expect(
      stage.getByRole("button", { name: "Creative", exact: true })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  });
test("new homepage examples respond to input", async ({ page }) => {
  await page.goto(origin);
  await page.getByRole("button", { name: "Add $250", exact: true }).click();
  await expect(page.getByLabel("Savings percentage")).toHaveText("70% saved");
  await page
    .getByRole("textbox", { name: "Product feedback", exact: true })
    .fill("支持中文反馈");
  await page
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(page.getByLabel("Feedback status")).toContainText("saved");
  await page
    .getByRole("radio", { name: "Annual · $120 / year", exact: true })
    .check();
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(page.getByLabel("Plan status")).toContainText("Annual");
  await page
    .getByRole("button", { name: "Tuesday, November 3rd, 2026", exact: true })
    .click();
  await expect(page.getByLabel("Review date")).toHaveText("November 3, 2026");
});
test("message combines history and composition", async ({ page }) => {
  await page.goto(origin + "docs/components/message");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { name: "Message text", exact: true })
    .fill("你好，团队！");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await expect(
    page.locator(".documentation-playground").getByLabel("Message count")
  ).toHaveText("13 messages");
  await expect(
    page.locator(".documentation-playground").getByRole("log")
  ).toContainText("你好，团队！");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { name: "First", exact: true })
    .click();
  await page
    .locator(".documentation-playground")
    .getByRole("button", { name: "Latest", exact: true })
    .click();
});
