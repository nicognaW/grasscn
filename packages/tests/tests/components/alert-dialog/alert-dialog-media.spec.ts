import { test, expect } from "@grasscn/tests/test";
test("AlertDialogMedia preserves semantic div/ref, caller attributes, rich children and events", async ({
  page,
}) => {
  await page.goto("/?component=alert-dialog-media");
  const dialog = page.getByRole("alertdialog", { name: "Confirm world" }),
    media = page.getByRole("group", { name: "Confirmation media" });
  await expect(dialog).toBeVisible();
  await expect(media).toHaveAttribute("data-slot", "alert-dialog-media");
  await expect(media).toHaveAttribute("data-user", "kept");
  await expect(media).toHaveClass(/caller-media/);
  await expect(media).toHaveCSS("gap", "8px");
  await expect(media.locator("strong")).toHaveText("World thumbnail");
  await expect(media.locator("small")).toHaveText("世界");
  await media.getByRole("button", { name: "Inspect media" }).click();
  await expect(page.getByLabel("Media events")).toHaveText("1");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Read media ref" }).click();
  await expect(page.getByLabel("Media ref")).toHaveText("DIV");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(dialog).toBeHidden();
});
