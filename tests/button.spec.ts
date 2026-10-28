import { test, expect } from "@playwright/test"

test("default button uses native proportions and supports keyboard activation", async ({ page }) => {
  await page.goto("/")
  const button = page.getByRole("button", { name: "Button", exact: true })
  await expect(button).toHaveCSS("width", "400px")
  await expect(button).toHaveCSS("height", "40px")
  await page.keyboard.press("Tab")
  await expect(button).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("status")).toHaveText("1")
  await page.keyboard.press("Space")
  await expect(page.getByRole("status")).toHaveText("2")
  await expect(page.getByRole("button", { name: "Disabled", exact: true })).toBeDisabled()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Continue" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/#destination$/)
})
