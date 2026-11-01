import { test, expect } from "@grasscn/tests/test";
import { documentationInventory } from "@tests/checks/documentation-inventory.mjs";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

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
    // oxlint-disable-next-line eslint/no-await-in-loop -- One page must complete each canonical document assertion before navigation.
    await page.goto(`${origin}docs/components/${name}`);
    // oxlint-disable-next-line eslint/no-await-in-loop -- One page must complete each canonical document assertion before navigation.
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      title
    );
    // oxlint-disable-next-line eslint/no-await-in-loop -- One page must complete each canonical document assertion before navigation.
    await expect(
      page.getByRole("heading", { exact: true, name: "Installation" })
    ).toBeVisible();
  }

  await page.goto(`${origin}docs/components/avatar`);
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
    await stage.getByRole("button", { exact: true, name: "Creative" }).click();
    await expect(page.getByLabel("Sidebar selection")).toHaveText("Creative");
    await page.keyboard.press("Control+b");
    await expect(
      stage.getByRole("button", { exact: true, name: "Creative" })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  });
test("new homepage examples respond to input", async ({ page }) => {
  await page.goto(origin);
  await page.getByRole("button", { exact: true, name: "Add $250" }).click();
  await expect(page.getByLabel("Savings percentage")).toHaveText("70% saved");
  await page
    .getByRole("textbox", { exact: true, name: "Product feedback" })
    .fill("支持中文反馈");
  await page
    .getByRole("button", { exact: true, name: "Save feedback" })
    .click();
  await expect(page.getByLabel("Feedback status")).toContainText("saved");
  await page
    .getByRole("radio", { exact: true, name: "Annual · $120 / year" })
    .check();
  await page.getByRole("button", { exact: true, name: "Save plan" }).click();
  await expect(page.getByLabel("Plan status")).toContainText("Annual");
  await page
    .getByRole("button", { exact: true, name: "Tuesday, November 3rd, 2026" })
    .click();
  await expect(page.getByLabel("Review date")).toHaveText("November 3, 2026");
});
test("message combines history and composition", async ({ page }) => {
  await page.goto(`${origin}docs/components/message`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Message text" })
    .fill("你好，团队！");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Send" })
    .click();
  await expect(
    page.locator(".documentation-playground").getByLabel("Message count")
  ).toHaveText("13 messages");
  await expect(
    page.locator(".documentation-playground").getByRole("log")
  ).toContainText("你好，团队！");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "First" })
    .click();
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Latest" })
    .click();
});
