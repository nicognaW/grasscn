import { test, expect } from "@grasscn/tests/test";
const errors = new WeakMap<object, string[]>();
test.beforeEach(({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (e) => list.push(e.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
test("DialogFooter defaultfalse keeps children/ref/attributes and no DOM boolean leakage", async ({
  page,
}) => {
  for (const suffix of ["", "?explicitFalse=1"]) {
    await page.goto("/?component=dialog-footer" + suffix.replace("?", "&"));
    await page
      .getByRole("button", { name: "Open footer", exact: true })
      .click();
    const footer = page.locator("[data-slot=dialog-footer]");
    await expect(footer).toHaveAttribute("data-forwarded", "kept");
    await expect(footer).toHaveClass(/custom-footer/);
    await expect(footer.getByRole("button")).toHaveCount(1);
    await expect(
      footer.getByRole("button", { name: "Close", exact: true })
    ).toHaveCount(0);
    expect(
      await footer.evaluate((n) => n.hasAttribute("showclosebutton"))
    ).toBe(false);
    await page.locator("#inspect-footer").dispatchEvent("click");
    await expect(page.locator("#footer-ref")).toHaveText("DIV");
    await footer
      .getByRole("button", { name: "Existing action", exact: true })
      .click();
    await expect(page.locator("#footer-events")).toHaveText("1");
    await expect(page.getByRole("dialog")).toBeVisible();
  }
});
test("DialogFooter enabled appends a native Close action with shared sizing and focus restoration", async ({
  page,
}) => {
  await page.goto("/?component=dialog-footer&enabled=1");
  const trigger = page.getByRole("button", {
    name: "Open footer",
    exact: true,
  });
  await trigger.click();
  const footer = page.locator("[data-slot=dialog-footer]");
  await expect(footer.getByRole("button")).toHaveCount(2);
  expect(await footer.evaluate((n) => n.hasAttribute("showclosebutton"))).toBe(
    false
  );
  await expect(footer.getByRole("button").first()).toHaveCSS("width", "208px");
  await expect(
    footer.getByRole("button", { name: "Close", exact: true })
  ).toHaveCSS("width", "208px");
  await footer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.locator("#inspect-footer").click();
  await expect(page.locator("#footer-ref")).toHaveText("none");
});
test("DialogFooter enabled retains existing children and supports keyboard close at scale3", async ({
  page,
}) => {
  await page.goto("/?component=dialog-footer&enabled=1&extra=1&scale=3");
  const trigger = page.getByRole("button", {
    name: "Open footer",
    exact: true,
  });
  await trigger.click();
  const footer = page.locator("[data-slot=dialog-footer]");
  await expect(footer.getByRole("button")).toHaveCount(3);
  await expect(
    footer.getByRole("button", { name: "Existing action", exact: true })
  ).toHaveCSS("width", "201px");
  await expect(
    footer.getByRole("button", { name: "Another action", exact: true })
  ).toBeVisible();
  const close = footer.getByRole("button", { name: "Close", exact: true });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
