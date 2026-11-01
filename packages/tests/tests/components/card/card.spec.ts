import { test, expect } from "@grasscn/tests/test";

test("Card keeps its ref, div attributes, content and interactive actions", async ({ page }) => {
  await page.goto("/?component=card&width=236&text=Hello&content=1&action=1")
  const card = page.getByLabel("Test card", { exact: true })
  await expect(card).toHaveAttribute("id", "subject")
  for (const slot of ["card-header", "card-title", "card-description", "card-content", "card-action", "card-footer"]) await expect(card.locator(`[data-slot="${slot}"]`)).toBeVisible()
  await page.getByLabel("Name", { exact: true }).fill("New world")
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("New world")
  await page.getByRole("button", { name: "Done", exact: true }).focus()
  await page.keyboard.press("Enter")
  await page.getByRole("button", { name: "Action", exact: true }).click()
  await expect(page.getByLabel("Activations", { exact: true })).toHaveText("2")
  await page.locator("#read-ref").click()
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("DIV")
})
