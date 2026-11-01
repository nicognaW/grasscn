import { test, expect } from "@grasscn/tests/test";
test("Form associates labels/descriptions, validates, focuses errors, submits CJK and resets", async ({
  page,
}) => {
  await page.goto("/?component=form");
  const input = page.getByRole("textbox", { name: "Player name" });
  await expect(input).toHaveAccessibleDescription("Your name in the world.");
  await expect(input).toHaveAttribute("spellcheck", "false");
  await page.getByRole("button", { name: "Save player", exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused();
  await expect(input).toHaveAccessibleDescription(
    "Your name in the world. Enter a player name"
  );
  await input.fill("你");
  await page.getByRole("button", { name: "Save player", exact: true }).click();
  await expect(input).toHaveAccessibleDescription(
    "Your name in the world. Use at least two characters"
  );
  await input.fill("世界");
  await page.getByRole("button", { name: "Save player", exact: true }).click();
  await expect(page.getByLabel("Saved player")).toHaveText("世界");
  await expect(input).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(input).toHaveValue("");
  await page.getByRole("button", { name: "Read ref", exact: true }).click();
  await expect(page.getByLabel("Label ref")).toHaveText("LABEL");
  await page
    .getByRole("button", { name: "Disable field", exact: true })
    .click();
  await expect(input).toBeDisabled();
});
test("Field uses actual fieldset/legend, label focus, refs and disabled inheritance", async ({
  page,
}) => {
  await page.goto("/?component=field");
  await expect(
    page.getByRole("group", { name: "World settings", exact: true })
  ).toBeVisible();
  const input = page.getByRole("textbox", { name: "World name" });
  await page.locator("label[for=world]").click();
  await expect(input).toBeFocused();
  await input.fill("こんにちは");
  await expect(input).toHaveValue("こんにちは");
  await page.getByRole("button", { name: "Read ref", exact: true }).click();
  await expect(page.getByLabel("Label ref")).toHaveText("LABEL");
  await page
    .getByRole("button", { name: "Disable fields", exact: true })
    .click();
  await expect(input).toBeDisabled();
});
test("Field deduplicates error messages and hides empty errors", async ({
  page,
}) => {
  await page.goto("/?component=field");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto("/?component=field&errors=1");
  const error = page.getByRole("alert");
  await expect(error.getByRole("listitem")).toHaveCount(2);
  await expect(error.getByRole("listitem").first()).toHaveAccessibleName("");
  await expect(error).toContainText("Required");
  await expect(error).toContainText("Try another name");
});
test("Field horizontal and vertical orientations change geometry and preserve keyboard access", async ({
  page,
}) => {
  for (const direction of ["horizontal", "vertical"]) {
    await page.goto("/?component=field&orientation=" + direction);
    const field = page.locator("[data-slot=field]");
    expect(await field.evaluate((n) => getComputedStyle(n).flexDirection)).toBe(
      direction === "horizontal" ? "row" : "column"
    );
    const input = page.getByRole("textbox", { name: "World name" });
    await input.focus();
    await input.press("Tab");
    await expect(
      page.getByRole("button", { name: "Disable fields", exact: true })
    ).toBeFocused();
  }
});
