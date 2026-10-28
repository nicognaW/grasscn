import { test, expect, type Locator, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { PNG } from "pngjs"
import { readFileSync } from "node:fs"
const catalog = JSON.parse(readFileSync("preview/catalog.generated.json", "utf8")) as { components: { name: string }[] }
const origin = "http://127.0.0.1:5176/"
async function focusByKeyboard(page: Page, locator: Locator) {
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab")
    if (await locator.evaluate(element => element === document.activeElement)) return
  }
  throw new Error("Preview control was not keyboard reachable")
}
async function nativePixels(locator: Locator, file: string) {
  const actual = PNG.sync.read(await locator.screenshot({ animations: "disabled" }))
  const expected = PNG.sync.read(await readFile(file))
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  expect(actual.data.equals(expected.data), "Preview chrome must preserve native pixels").toBe(true)
}
test("Preview includes every finished component with working interactions", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(origin)
  for (const component of catalog.components) await expect(page.locator(`#component-${component.name} [data-stage="${component.name}"]`)).toBeVisible()
  await page.locator('#component-button [data-slot="button"]').first().click()
  await expect(page.getByLabel("Button activations")).toHaveText("Pressed 1 time")
  await page.getByRole("checkbox", { name: "Enable shadows" }).check()
  await expect(page.getByLabel("Checkbox value")).toHaveText("Checked")
  await page.getByRole("slider", { name: "Volume", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByLabel("Slider value")).toHaveText("51%")
  expect(errors).toEqual([])
})
test("Preview navigation, search, editing, width and scale work", async ({ page }) => {
  await page.goto(`${origin}#button`)
  await expect(page.locator(".component-card")).toHaveCount(1)
  await page.getByLabel("Button label").fill("Done")
  await page.getByLabel("Button width").selectOption("150")
  await page.getByRole("button", { name: "3×", exact: true }).click()
  const button = page.locator('#component-button [data-slot="button"]').first()
  await expect(button).toHaveCSS("width", "450px")
  await expect(button).toHaveAccessibleName("Done")
  await page.getByRole("searchbox", { name: "Find a component" }).fill("slider")
  await expect(page.locator(".component-card")).toHaveCount(1)
  await expect(page.locator("#component-slider")).toBeVisible()
  await page.getByRole("searchbox", { name: "Find a component" }).fill("no-such-component")
  await expect(page.getByText("No finished component matches.")).toBeVisible()
  await page.getByRole("button", { name: "Show all components", exact: true }).click()
  await expect(page.locator(".component-card")).toHaveCount(catalog.components.length)
})
for (const scale of [1, 2, 3]) {
  test(`Preview native pixels at scale ${scale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`${origin}#button`)
    await page.getByRole("button", { name: `${scale}×`, exact: true }).click()
    const button = page.locator('#component-button [data-slot="button"]').first()
    await page.mouse.move(0, 0)
    await nativePixels(button, `tests/reference/captures/normal-w200-s${scale}.png`)
    await button.hover()
    await nativePixels(button, `tests/reference/captures/hover-w200-s${scale}.png`)
    await page.mouse.move(0, 0)
    await focusByKeyboard(page, button)
    await nativePixels(button, `tests/reference/captures/focus-w200-s${scale}.png`)
    await nativePixels(page.locator('#component-button [data-slot="button"]').nth(1), `tests/reference/captures/disabled-w200-s${scale}.png`)
    await page.goto(`${origin}#checkbox`)
    await page.getByRole("button", { name: `${scale}×`, exact: true }).click()
    const checkbox = page.getByRole("checkbox", { name: "Enable shadows" })
    await page.mouse.move(0, 0)
    await nativePixels(checkbox, `tests/reference/controls/captures/checkbox-unchecked-normal-s${scale}.png`)
    await focusByKeyboard(page, checkbox)
    await nativePixels(checkbox, `tests/reference/controls/captures/checkbox-unchecked-focus-s${scale}.png`)
    await nativePixels(page.getByRole("checkbox", { name: "Unavailable" }), `tests/reference/controls/captures/checkbox-checked-disabled-s${scale}.png`)
    await page.goto(`${origin}#slider`)
    await page.getByRole("button", { name: `${scale}×`, exact: true }).click()
    const slider = page.locator('#component-slider [data-slot="slider"]').first()
    await slider.hover()
    await nativePixels(slider, `tests/reference/slider/captures/slider-w200-v500-hover-s${scale}.png`)
    await nativePixels(page.locator('#component-slider [data-slot="slider"]').nth(1), `tests/reference/slider/captures/slider-w200-v500-disabled-s${scale}.png`)
  })
}
test("Mobile preview contains every scale without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(origin)
  for (const scale of [1, 2, 3]) {
    await page.getByRole("button", { name: `${scale}×`, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const component of catalog.components) await expect(page.locator(`#component-${component.name}`)).toBeVisible()
  }
})
