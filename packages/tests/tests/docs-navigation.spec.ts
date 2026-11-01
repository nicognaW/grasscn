import { expect, test } from "./verified-test"

const website = (process.env.GRASSCN_WEBSITE_URL ?? process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176").replace(/\/$/, "")

test("documentation sidebar and heading links follow the authored page tree", async ({ page }, testInfo) => {
  await page.goto(`${website}/docs`)
  await page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Button", exact: true }).click({ timeout: 5000 })
  await expect(page).toHaveURL(`${website}/docs/components/button`)
  await expect(page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Button", exact: true })).toHaveAttribute("aria-current", "page")
  await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Usage", exact: true }).click({ timeout: 5000 })
  await expect(page).toHaveURL(`${website}/docs/components/button#usage`)
  await expect(page.getByRole("heading", { name: "Usage", exact: true })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath("actual-docs-desktop.png"), fullPage: true })
})

test("documentation search finds authored prose and follows its section", async ({ page }) => {
  await page.goto(`${website}/docs`)
  await page.keyboard.press("Control+k")
  const search = page.getByRole("combobox", { name: "Search documentation" })
  await expect(search).toBeFocused()
  await search.fill("hear", { timeout: 5000 })
  await expect(page.getByRole("option", { name: "Activate a button to hear the original Minecraft click.", exact: true })).toBeVisible()
  await search.press("ArrowDown")
  await search.press("Enter")
  await expect(page).toHaveURL(`${website}/docs/components/button#usage`)
  await expect(page.getByRole("heading", { name: "Usage", exact: true })).toBeInViewport()
})

test("documentation search discovers the public component export", async ({ page }) => {
  await page.goto(`${website}/docs`)
  const search = page.getByRole("combobox", { name: "Search documentation" })
  await search.fill("buttonVariants")
  await page.getByRole("option", { name: "buttonVariants", exact: true }).click({ timeout: 5000 })
  await expect(page).toHaveURL(`${website}/docs/components/button#usage`)
  await expect(page.getByRole("heading", { name: "Button", exact: true })).toBeVisible()
})

test("documentation search discovers a component alias", async ({ page }) => {
  await page.goto(`${website}/docs`)
  await page.getByRole("combobox", { name: "Search documentation" }).fill("push button")
  await page.getByRole("option", { name: "push button", exact: true }).click({ timeout: 5000 })
  await expect(page).toHaveURL(`${website}/docs/components/button#usage`)
})

test("the legacy Button link retains its query and reaches the usage section", async ({ page }) => {
  await page.goto(`${website}/components/button?ref=bookmark#component-import`)
  await expect(page).toHaveURL(`${website}/docs/components/button?ref=bookmark#usage`)
  await expect(page.getByRole("heading", { name: "Usage", exact: true })).toBeInViewport()
})

test("the legacy Field export result reaches independently discoverable Field documentation", async ({ page }) => {
  await page.goto(`${website}/components/form?part=FieldLabel#component-import`)
  await expect(page).toHaveURL(`${website}/docs/components/field?part=FieldLabel#usage`)
  await expect(page.getByRole("heading", { name: "Field", exact: true })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Field", exact: true })).toHaveAttribute("aria-current", "page")
})

test("mobile documentation navigation opens the page tree without page overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${website}/docs`)
  const browse = page.getByRole("button", { name: "Browse documentation", exact: true })
  await browse.click({ timeout: 5000 })
  await expect(browse).toHaveAttribute("aria-expanded", "true")
  await page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Button", exact: true }).click()
  await expect(page).toHaveURL(`${website}/docs/components/button`)
  await expect(browse).toHaveAttribute("aria-expanded", "false")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: testInfo.outputPath("actual-docs-mobile.png"), fullPage: true })
})

