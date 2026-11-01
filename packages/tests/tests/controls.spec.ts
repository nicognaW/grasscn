import { test, expect } from "./verified-test";

test("Checkbox supports keyboard and pointer controlled changes", async ({ page }) => {
  await page.goto("/?component=checkbox")
  const checkbox = page.getByRole("checkbox", { name: "Test checkbox" })
  await expect(checkbox).not.toBeChecked()
  await page.keyboard.press("Tab")
  await expect(checkbox).toBeFocused()
  await page.keyboard.press("Space")
  await expect(checkbox).toBeChecked()
  await expect(page.getByLabel("Changes")).toHaveText("1")
  await checkbox.click()
  await expect(checkbox).not.toBeChecked()
  await expect(page.getByLabel("Changes")).toHaveText("2")
})

test("Disabled checkbox cannot change and is skipped by Tab", async ({ page }) => {
  await page.goto("/?component=checkbox&checked=true&state=disabled")
  const checkbox = page.getByRole("checkbox")
  await expect(checkbox).toBeDisabled()
  const bounds = (await checkbox.boundingBox())!
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await expect(checkbox).toBeChecked()
  await expect(page.getByLabel("Changes")).toHaveText("0")
  await page.keyboard.press("Tab")
  await expect(page.locator("#next")).toBeFocused()
})

test("Mixed checkbox keeps web semantics and can become checked", async ({ page }) => {
  await page.goto("/?component=checkbox&checked=mixed")
  const checkbox = page.getByRole("checkbox")
  await expect(checkbox).toHaveAttribute("aria-checked", "mixed")
  await checkbox.click()
  await expect(checkbox).toBeChecked()
  await expect(page.getByLabel("Changes")).toHaveText("1")
})
