import { test, expect } from "@grasscn/tests/test";

test("Base UI state callbacks retain Minecraft defaults and update on the native state", async ({
  page,
}) => {
  await page.goto("/?component=base-ui-composition");

  const button = page.getByRole("button", {
    exact: true,
    name: "Stateful button",
  });

  await expect(button).toHaveClass(/mc-button/u);
  await expect(button).toHaveClass(/state-enabled/u);
  await expect(button).toHaveCSS("width", "240px");
  await page
    .getByRole("button", { exact: true, name: "Toggle disabled" })
    .click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveClass(/state-disabled/u);
  await expect(button).toHaveCSS("width", "300px");
  const checkbox = page.getByRole("checkbox", { name: "Stateful checkbox" });
  await expect(checkbox).toHaveClass(/mc-checkbox/u);
  await expect(checkbox).toHaveClass(/state-unchecked/u);
  await checkbox.click();
  await expect(checkbox).toHaveClass(/state-checked/u);
  await expect(checkbox).toHaveCSS("--checked-state", "1");
});

test("Input uses Base UI Field state and popup callbacks receive popup state", async ({
  page,
}) => {
  await page.goto("/?component=base-ui-composition");

  const input = page.getByRole("textbox", {
    exact: true,
    name: "Inherited field",
  });

  await expect(input).toHaveValue("Hello 世界");
  await expect(input).toBeEnabled();
  await expect(
    page.getByRole("link", { exact: true, name: "Composed group text" })
  ).toHaveAttribute("href", "#group");
  await expect(
    page.getByRole("link", { exact: true, name: "Composed sidebar label" })
  ).toHaveAttribute("href", "#sidebar");
  await page
    .getByRole("button", { exact: true, name: "Toggle disabled" })
    .click();
  await expect(input).toBeDisabled();
  await page
    .getByRole("button", { exact: true, name: "Open stateful dialog" })
    .click();

  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Native state",
  });

  await expect(dialog).toHaveClass(/mc-dialog-content/u);
  await expect(dialog).toHaveClass(/state-open/u);
  await expect(dialog).toHaveCSS("--open-state", "1");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("sidebar submenu render forwards consumer attributes and handlers once", async ({
  page,
}) => {
  await page.goto("/?component=base-ui-composition");

  const link = page.getByRole("link", {
    exact: true,
    name: "Composed submenu",
  });

  await expect(link).toHaveAttribute("href", "#composed-sub");
  await link.click();
  await expect(page.getByLabel("Submenu actions", { exact: true })).toHaveText(
    "1"
  );
});
