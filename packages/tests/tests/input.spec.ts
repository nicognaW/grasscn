import { test, expect } from "./verified-test"
import { readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
const manifest = JSON.parse(readFileSync("tests/reference/input/manifest.json", "utf8")) as {
  cases: { name: string; text: string; placeholder?: string; cursor?: number; anchor?: number; caretMs: number; maxLength?: number; state: string; width: number; height: number; scale: number; sha256: string }[]
}
function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  let mismatchedPixels = 0
  const diff = new PNG({ width: expected.width, height: expected.height })
  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !actual.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4))
    mismatchedPixels += Number(mismatch)
    diff.data.set(mismatch ? [255, 0, 255, 255] : [expected.data[i] >> 2, expected.data[i + 1] >> 2, expected.data[i + 2] >> 2, 255], i)
  }
  return { diff, mismatchedPixels }
}
test("Input pixel comparator detects a one-pixel change", async () => {
  const expected = PNG.sync.read(await readFile(`tests/reference/input/captures/${manifest.cases[0].name}`))
  const actual = PNG.sync.read(PNG.sync.write(expected))
  actual.data[0] ^= 1
  expect(compare(expected, actual).mismatchedPixels).toBe(1)
})
for (const c of manifest.cases) test(`Input native pixels: ${c.name}`, async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") })
  await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"))
  const query = new URLSearchParams({ component: "input", text: c.text, placeholder: c.placeholder ?? "", state: c.state, width: String(c.width), scale: String(c.scale) })
  if (c.maxLength != null) query.set("maxLength", String(c.maxLength))
  await page.goto(`/?${query}`)
  const input = page.getByRole("textbox", { name: "Test input" })
  await expect(input).toBeVisible()
  await expect(input).toHaveAttribute("data-mc-ready", "true")
  if (c.state.startsWith("focus")) { await page.keyboard.press("Tab"); await expect(input).toBeFocused() }
  if (c.state === "hover") await input.hover()
  else await page.mouse.move(0, 0)
  const cursor = c.cursor ?? c.text.length, anchor = c.anchor ?? cursor
  await input.evaluate((node, selection) => {
    const input = node as HTMLInputElement
    input.setSelectionRange(Math.min(selection.cursor, selection.anchor), Math.max(selection.cursor, selection.anchor), selection.cursor < selection.anchor ? "backward" : "forward")
  }, { cursor, anchor })
  await page.clock.runFor(c.caretMs)
  await expect(input).toHaveAttribute("data-mc-ready", "true")
  const expectedBytes = await readFile(`tests/reference/input/captures/${c.name}`)
  expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actualBytes = await input.screenshot({ animations: "disabled" })
  const actual = PNG.sync.read(actualBytes), expected = PNG.sync.read(expectedBytes)
  const { diff, mismatchedPixels } = compare(expected, actual)
  await writeFile(testInfo.outputPath("actual.png"), actualBytes)
  await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff))
  await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, totalPixels: expected.width * expected.height, tolerance: 0 }, null, 2))
  expect(mismatchedPixels).toBe(0)
})

test("Input preserves controlled editing, selection, keyboard deletion and change events", async ({ page }) => {
  await page.goto("/?component=input&text=Hello")
  const input = page.getByRole("textbox", { name: "Test input" })
  await input.fill("Minecraft")
  await expect(input).toHaveValue("Minecraft")
  await expect(page.getByLabel("Input value", { exact: true })).toHaveText("Minecraft")
  await expect(page.getByLabel("Input changes", { exact: true })).toHaveText("1")
  await page.keyboard.press("Home")
  await page.keyboard.press("Shift+ArrowRight")
  await page.keyboard.press("Backspace")
  await expect(input).toHaveValue("inecraft")
  await expect(page.getByLabel("Input changes", { exact: true })).toHaveText("2")
})
test("Input retains uncontrolled form reset and form submission", async ({ page }) => {
  await page.goto("/?component=input&text=Hello&uncontrolled=1")
  const input = page.getByRole("textbox", { name: "Test input" })
  await input.fill("Done")
  expect(await page.locator("form").evaluate(element => new FormData(element as HTMLFormElement).get("message"))).toBe("Done")
  await page.locator("#reset").click()
  await expect(input).toHaveValue("Hello")
  await input.press("Enter")
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("1")
})
test("Disabled Input is skipped by keyboard focus", async ({ page }) => {
  await page.goto("/?component=input&text=Hello&state=disabled")
  const input = page.getByRole("textbox", { name: "Test input" })
  await expect(input).toBeDisabled()
  await page.keyboard.press("Tab")
  await expect(page.locator("#submit")).toBeFocused()
})
test("Read-only Input remains keyboard-focusable and immutable", async ({ page }) => {
  await page.goto("/?component=input&text=Hello&state=readonly")
  const input = page.getByRole("textbox", { name: "Test input" })
  await expect(input).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(input).toBeFocused()
  await page.keyboard.type("abc")
  await expect(input).toHaveValue("Hello")
  await expect(page.getByLabel("Input changes", { exact: true })).toHaveText("0")
})
test("Input uses the real DOM ref and repaints imperative value assignments", async ({ page }) => {
  await page.goto("/?component=input&text=Hello")
  const input = page.getByRole("textbox", { name: "Test input" })
  await expect(input).toHaveAttribute("data-mc-ready", "true")
  const before = await input.evaluate(element => (element as HTMLInputElement).style.getPropertyValue("--mc-input-image"))
  await page.locator("#read-ref").click()
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("INPUT")
  await page.locator("#imperative").click()
  await expect(input).toHaveValue("Done")
  await expect.poll(() => input.evaluate(element => (element as HTMLInputElement).style.getPropertyValue("--mc-input-image"))).not.toBe(before)
})
test("Input keeps HTML validation and maxlength", async ({ page }) => {
  await page.goto("/?component=input&text=&required=1&pattern=[0-9]{3}&maxLength=3")
  const input = page.getByRole("textbox", { name: "Test input" })
  await page.locator("#submit").click()
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("0")
  await input.fill("abc")
  expect(await input.evaluate(element => (element as HTMLInputElement).validity.patternMismatch)).toBe(true)
  await input.fill("")
  await page.keyboard.type("12345")
  await expect(input).toHaveValue("123")
  await page.locator("#submit").click()
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("1")
})
test("Input preserves password and unsupported glyph browser rendering fallbacks", async ({ page }) => {
  await page.goto("/?component=input&text=secret&type=password")
  const input = page.locator("[data-subject]")
  await expect(input).toHaveAttribute("type", "password")
  await expect(input).toHaveAttribute("data-mc-bitmap", "false")
  await expect(input).toHaveValue("secret")
  await page.goto("/?component=input&text=Hello")
  await input.fill("Hello 🙂")
  await expect(input).toHaveValue("Hello 🙂")
  await expect(input).toHaveAttribute("data-mc-bitmap", "false")
  await input.fill("Hello")
  await expect(input).toHaveAttribute("data-mc-bitmap", "true")
})
test("Input pointer position uses the same original font advances", async ({ page }) => {
  await page.goto("/?component=input&text=WWWWWW")
  const input = page.getByRole("textbox", { name: "Test input" })
  await page.evaluate(() => document.fonts.ready)
  const bounds = (await input.boundingBox())!
  await page.mouse.click(bounds.x + (4 + 6 * 3) * 2, bounds.y + bounds.height / 2)
  expect(await input.evaluate(element => (element as HTMLInputElement).selectionStart)).toBe(3)
})
