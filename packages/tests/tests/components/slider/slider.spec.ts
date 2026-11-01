import { test, expect } from "@grasscn/tests/test";

test("Slider keyboard updates controlled value and commits, including endpoints", async ({ page }) => {
  await page.goto("/?component=slider&value=500")
  const thumb = page.getByRole("slider")
  await expect(thumb).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(thumb).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(thumb).toHaveAttribute("aria-valuenow", "501")
  await page.keyboard.press("Home")
  await expect(thumb).toHaveAttribute("aria-valuenow", "0")
  await page.keyboard.press("End")
  await expect(thumb).toHaveAttribute("aria-valuenow", "1000")
  await expect(page.getByLabel("Values", { exact: true })).toHaveText("1000")
  await expect(page.getByLabel("Commits", { exact: true })).toHaveText("3")
})

test("Slider pointer drag changes value and commits on release", async ({ page }) => {
  await page.goto("/?component=slider&value=100")
  const bounds = (await page.locator("[data-subject]").boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .1, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height / 2, { steps: 4 })
  await page.mouse.up()
  const actual = Number(await page.getByRole("slider").getAttribute("aria-valuenow"))
  expect(actual).toBeGreaterThan(750)
  expect(actual).toBeLessThan(850)
  await expect(page.getByLabel("Commits", { exact: true })).toHaveText("1")
})

test("Disabled slider ignores pointer changes and keyboard focus", async ({ page }) => {
  await page.goto("/?component=slider&state=disabled&value=500")
  const bounds = (await page.locator("[data-subject]").boundingBox())!
  await page.mouse.click(bounds.x + bounds.width * .8, bounds.y + bounds.height / 2)
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", "500")
  await expect(page.getByLabel("Changes", { exact: true })).toHaveText("0")
  await page.keyboard.press("Tab")
  await expect(page.locator("#next")).toBeFocused()
})

test("Range slider keeps separate thumbs and named form values", async ({ page }) => {
  await page.goto("/?component=slider&values=200,800")
  const thumbs = page.getByRole("slider")
  await expect(thumbs).toHaveCount(2)
  await page.keyboard.press("Tab")
  await page.keyboard.press("ArrowRight")
  await expect(thumbs.nth(0)).toHaveAttribute("aria-valuenow", "201")
  await expect(thumbs.nth(1)).toHaveAttribute("aria-valuenow", "800")
  await page.keyboard.press("Tab")
  await page.keyboard.press("ArrowLeft")
  await expect(thumbs.nth(1)).toHaveAttribute("aria-valuenow", "799")
  const form = await page.locator("form").evaluate(element => Array.from(new FormData(element as HTMLFormElement).entries()))
  expect(form).toEqual([["volume", "201"], ["volume", "799"]])
})

test("Slider preserves uncontrolled form reset and forwarded ref", async ({ page }) => {
  await page.goto("/?component=slider&uncontrolled=1&value=500")
  const thumb = page.getByRole("slider")
  await expect(thumb).toBeVisible()
  await expect(thumb).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(thumb).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(thumb).toHaveAttribute("aria-valuenow", "501")
  await page.locator("#reset").click()
  await expect(thumb).toHaveAttribute("aria-valuenow", "500")
  await page.locator("#read-ref").click()
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("subject")
})

test("Slider preserves shadcn default range shape", async ({ page }) => {
  await page.goto("/?component=slider&default-range=1")
  const thumbs = page.getByRole("slider")
  await expect(thumbs).toHaveCount(2)
  await expect(thumbs.nth(0)).toHaveAttribute("aria-valuenow", "0")
  await expect(thumbs.nth(1)).toHaveAttribute("aria-valuenow", "1000")
})

test("RTL slider changes with RTL arrows and places minimum at the right", async ({ page }) => {
  await page.goto("/?component=slider&dir=rtl&value=0")
  const thumb = page.getByRole("slider")
  const root = (await page.locator("[data-subject]").boundingBox())!, handle = (await thumb.boundingBox())!
  expect(handle.x + handle.width).toBe(root.x + root.width)
  await page.keyboard.press("Tab")
  await page.keyboard.press("ArrowLeft")
  await expect(thumb).toHaveAttribute("aria-valuenow", "1")
})

test("Vertical sliders retain native Base UI value behavior", async ({ page }) => {
  await page.goto("/?component=slider&orientation=vertical&value=0")
  const thumb = page.getByRole("slider")
  await expect(thumb).toHaveAttribute("aria-orientation", "vertical")
  const root = (await page.locator("[data-subject]").boundingBox())!, handle = (await thumb.boundingBox())!
  expect(handle.y + handle.height).toBe(root.y + root.height)
  await page.keyboard.press("Tab")
  await page.keyboard.press("ArrowUp")
  await expect(thumb).toHaveAttribute("aria-valuenow", "1")

})
