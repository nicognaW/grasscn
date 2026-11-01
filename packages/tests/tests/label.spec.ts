import { test, expect } from "./verified-test";

test("Label associates its input, forwards its ref and preserves events", async ({ page }) => {
  await page.goto("/?component=label&label=World%20name")
  await page.locator("[data-subject]").click()
  await expect(page.getByRole("textbox", { name: "World name" })).toBeFocused()
  await expect(page.getByLabel("Activations", { exact: true })).toHaveText("1")
  await page.locator("#read-ref").click()
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("LABEL")
})

test("Label keeps disabled association and rich children", async ({ page }) => {
  await page.goto("/?component=label&label=World%20name&state=disabled")
  const bounds = await page.locator("[data-subject]").boundingBox()
  await page.mouse.click(bounds!.x + 5, bounds!.y + 5)
  await expect(page.getByRole("textbox", { name: "World name" })).toBeDisabled()
  await expect(page.getByRole("textbox", { name: "World name" })).not.toBeFocused()
  await page.goto("/?component=label&rich=1")
  await expect(page.locator("label strong")).toHaveText("Rich label")
  await page.locator("label strong").click()
  await expect(page.getByRole("textbox", { name: "Rich label" })).toBeFocused()
})

test("Label preserves the complete accessible name across wrapped lines", async ({ page }) => {
  const label = "Create a new world with friends"
  await page.goto(`/?component=label&wrapWidth=100&label=${encodeURIComponent(label)}`)
  await expect(page.getByRole("textbox", { name: label, exact: true })).toBeVisible()
  await page.locator("[data-subject]").click()
  await expect(page.getByRole("textbox", { name: label, exact: true })).toBeFocused()
})
