import { test, expect, type Page } from "./verified-test"
import { minecraftClickSound } from "../registry/ui/minecraft-sound-assets"

async function openMenu(page: Page, query = "") {
  await page.goto(`/?component=context-menu&${query}`)
  await page.locator("#context-hit").click({ button: "right", position: { x: 24, y: 24 } })
}

test("Context Menu uses pointer anchoring and skips disabled items with the keyboard", async ({ page }) => {
  await openMenu(page)
  const menu = page.getByRole("menu")
  await expect(menu).toBeVisible()
  const trigger = (await page.locator("#context-hit").boundingBox())!
  const border = await page.locator("#context-hit").evaluate(node => {
    const style = getComputedStyle(node)
    return [parseFloat(style.borderLeftWidth), parseFloat(style.borderTopWidth)]
  })
  const bounds = (await menu.boundingBox())!
  expect([bounds.x, bounds.y]).toEqual([trigger.x + border[0] + 24 + 4, trigger.y + border[1] + 24])
  await page.keyboard.press("Home")
  await expect(page.getByRole("menuitem", { name: /Resume game/ })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("menuitem",{name:"Unavailable",exact:true})).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "你好，世界", exact: true })).toBeFocused()
  await page.keyboard.press("End")
  await expect(page.getByRole("menuitem", { name: "More", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("menuitem", { name: "Video settings", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByRole("menuitem", { name: "More", exact: true })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(menu).toHaveCount(0)
})

test("Context Menu invokes an action once and closes", async ({ page }) => {
  await openMenu(page)
  await page.getByRole("menuitem", { name: /Resume game/ }).click()
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText("1")
  await expect(page.getByRole("menu")).toHaveCount(0)
})

test("Context Menu preserves checkbox, radio and prevented-close behavior", async ({ page }) => {
  await openMenu(page, "keepOpen")
  const checkbox = page.getByRole("menuitemcheckbox", { name: "Show coordinates", exact: true })
  await checkbox.click()
  await expect(checkbox).toBeChecked()
  await expect(page.getByRole("menu")).toBeVisible()
  await page.getByRole("menuitemradio", { name: "Game", exact: true }).click()
  await expect(page.getByLabel("Menu radio", { exact: true })).toHaveText("game")
  await expect(page.getByRole("menu")).toBeVisible()
})

for (const query of ["disabled", "preventTrigger", "controlled&reject"]) {
  test(`Context Menu respects ${query}`, async ({ page }) => {
    await openMenu(page, query)
    await expect(page.getByRole("menu")).toHaveCount(0)
  })
}

test("Context Menu supports controlled state and event cancellation", async ({ page }) => {
  await openMenu(page, "controlled")
  await expect(page.getByRole("menu")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu")).toHaveCount(0)
  await openMenu(page, "preventEscape&preventOutside")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu")).toBeVisible()
  await page.locator("#context-outside").click({ force: true })
  await expect(page.getByRole("menu")).toBeVisible()
})

test("Context Menu preserves composed element refs and actions", async ({ page }) => {
  await openMenu(page, "triggerAsChild&contentAsChild&nonmodal&preventOutside")
  await expect(page.locator("#context-hit")).toHaveJSProperty("tagName", "BUTTON")
  await expect(page.getByRole("menu")).toHaveJSProperty("tagName", "SECTION")
  await page.locator("#context-outside").evaluate((node:HTMLButtonElement)=>node.click())
  await expect(page.getByLabel("Menu refs", { exact: true })).toHaveText("BUTTON,SECTION")
  await page.getByRole("menuitem", { name: "Composed action", exact: true }).click()
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText("1")
  await page.locator("#context-outside").evaluate((node:HTMLButtonElement)=>node.click())
  await expect(page.getByLabel("Menu refs", { exact: true })).toHaveText("BUTTON,")
})

test("Context Menu renders CJK actions without browser errors", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message))
  await openMenu(page)
  const item = page.getByRole("menuitem", { name: "你好，世界", exact: true })
  await expect(item.locator('[data-mc-menu-unicode-ready]')).toHaveAttribute("data-mc-menu-unicode-ready", "true")
  await item.click()
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText("1")
  expect(errors).toEqual([])
})

test("Context Menu follows RTL submenu navigation", async ({ page }) => {
  await openMenu(page, "rtl")
  await page.keyboard.press("End")
  await expect(page.getByRole("menuitem", { name: "More", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByRole("menuitem", { name: "Video settings", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("menuitem", { name: "More", exact: true })).toBeFocused()
})

test("Context Menu opening and hovering stay silent; checkbox activation plays the original click once", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__contextVoices = []
    HTMLMediaElement.prototype.play = function () {
      (window as any).__contextVoices.push({ source: this.src, volume: this.volume, rate: this.playbackRate })
      return Promise.resolve()
    }
  })
  await openMenu(page, "keepOpen")
  await page.getByRole("menuitem", { name: /Resume game/ }).hover()
  expect(await page.evaluate(() => (window as any).__contextVoices)).toEqual([])
  await page.getByRole("menuitemcheckbox", { name: "Show coordinates", exact: true }).click()
  expect(await page.evaluate(() => (window as any).__contextVoices)).toEqual([{ source: minecraftClickSound, volume: .25, rate: 1 }])
})

test("Context Menu opens on touch long-press and cancels a cancelled touch", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true })
  try {
    const page = await context.newPage(), cdp = await context.newCDPSession(page)
    await page.goto("/?component=context-menu")
    await expect(page.locator("#context-hit")).toBeVisible()
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 100, y: 100 }] })
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 2000 })
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menu")).toHaveCount(0)
    await page.goto("/?component=context-menu")
    await expect(page.locator("#context-hit")).toBeVisible()
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 100, y: 100 }] })
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] })
    await page.waitForTimeout(850)
    await expect(page.getByRole("menu")).toHaveCount(0)
  } finally { await context.close() }
})
