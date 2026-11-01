import { test, expect } from "./verified-test";

test("Textarea preserves controlled multiline editing, events and Enter behavior", async ({ page }) => {
  await page.goto("/?component=textarea&text=Hello")
  const area = page.getByRole("textbox", { name: "Test textarea" })
  await area.fill("Minecraft\nGrass")
  await expect(page.getByLabel("Textarea value", { exact: true })).toHaveText("Minecraft\nGrass")
  await expect(page.getByLabel("Textarea changes", { exact: true })).toHaveText("1")
  await area.press("End")
  await area.press("Enter")
  await expect(area).toHaveValue("Minecraft\nGrass\n")
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("0")
  await page.locator("#submit").click()
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("1")
})

test("Textarea keeps its native ref, uncontrolled form data and reset repaint", async ({ page }) => {
  await page.goto("/?component=textarea&text=Hello&uncontrolled=1")
  const area = page.getByRole("textbox", { name: "Test textarea" })
  await expect(area).toHaveAttribute("data-mc-ready", "true")
  const original = await area.evaluate(node => (node as HTMLElement).style.getPropertyValue("--mc-textarea-image"))
  await area.fill("New\nvalue")
  expect(await page.locator("form").evaluate(node => new FormData(node as HTMLFormElement).get("message"))).toBe("New\nvalue")
  await page.locator("#reset").click()
  await expect(area).toHaveValue("Hello")
  await expect.poll(() => area.evaluate(node => (node as HTMLElement).style.getPropertyValue("--mc-textarea-image"))).toBe(original)
  await page.locator("#read-ref").click()
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("TEXTAREA")
})

test("Textarea respects read-only and disabled native semantics", async ({ page }) => {
  await page.goto("/?component=textarea&text=Hello&state=readonly")
  const area = page.getByRole("textbox", { name: "Test textarea" })
  await area.focus(); await area.press("a")
  await expect(area).toHaveValue("Hello")
  await page.goto("/?component=textarea&text=Hello&state=disabled")
  await expect(area).toBeDisabled()
  await page.keyboard.press("Tab")
  await expect(page.locator("#submit")).toBeFocused()
})

test("Textarea retains unsupported Unicode input through the browser fallback", async ({ page }) => {
  await page.goto("/?component=textarea&text=Hello")
  const area = page.getByRole("textbox", { name: "Test textarea" })
  await area.fill("Hello 🙂")
  await expect(area).toHaveValue("Hello 🙂")
  await expect(area).toHaveAttribute("data-mc-bitmap", "false")
  await area.fill("Hello\nagain")
  await expect(area).toHaveAttribute("data-mc-bitmap", "true")
})

test("Textarea scrollbar can be dragged and wheel scrolling remains native", async ({ page }) => {
  const text = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`).join("\n")
  await page.goto(`/?${new URLSearchParams({ component: "textarea", text, width: "206", height: "80" })}`)
  const area = page.getByRole("textbox", { name: "Test textarea" })
  await expect(area).toHaveAttribute("data-mc-scrollbar", "true")
  const bounds = (await area.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width - 6, bounds.y + 20)
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width - 6, bounds.y + 50); await page.mouse.up()
  await expect.poll(() => area.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
  await area.evaluate(node => { node.scrollTop = 0 })
  await area.hover(); await page.mouse.wheel(0, 100)
  await expect.poll(() => area.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
})
