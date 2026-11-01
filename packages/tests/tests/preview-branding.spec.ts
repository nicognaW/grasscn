import { test, expect } from "./verified-test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"

test("Grasscn logo stays crisp and contained on narrow preview screens", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(`${origin}#all`)
    const logo = page.getByRole("banner").getByRole("link", { name: "grasscn home", exact: true }).locator("img")
    await expect(logo).toHaveCSS("width", "110px")
    await expect(logo).toHaveCSS("height", "40px")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
