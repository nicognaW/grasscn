import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
type NativeCase = { name: string; text: string; placeholder?: string; state: string; width: number; height: number; scale: number; x: number; y: number; value?: number; cursor?: number; anchor?: number; caretMs: number; sha256: string; referenceDirectory: string }
const manifest = { cases: ["textarea", "textarea-cjk"].flatMap(directory => (JSON.parse(readFileSync(resolveRepositoryPath(`tests/reference/${directory}/manifest.json`, testRoot), "utf8")).cases as NativeCase[]).map(c => ({ ...c, referenceDirectory: directory }))) }
function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  const diff = new PNG({ width: expected.width, height: expected.height })
  let mismatchedPixels = 0
  for (let i = 0; i < expected.data.length; i += 4) {
    const different = !actual.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4))
    mismatchedPixels += Number(different)
    diff.data.set(different ? [255, 0, 255, 255] : [expected.data[i] >> 2, expected.data[i + 1] >> 2, expected.data[i + 2] >> 2, 255], i)
  }
  return { diff, mismatchedPixels }
}
test("Textarea comparator catches a one-pixel mutation", async () => {
  const expected = PNG.sync.read(await readFile(resolveRepositoryPath(`tests/reference/textarea/captures/${manifest.cases[0].name}`, testRoot)))
  const actual = PNG.sync.read(PNG.sync.write(expected)); actual.data[0] ^= 1
  expect(compare(expected, actual).mismatchedPixels).toBe(1)
})

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
for (const c of manifest.cases) test(`Textarea native pixels: ${c.name}`, async ({ page }, testInfo) => {
  if (c.referenceDirectory === "textarea-cjk") await page.setViewportSize({ width: 1536, height: 900 })
  await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") })
  await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"))
  await page.goto(`/?${new URLSearchParams({ component: "textarea", text: c.text, placeholder: c.placeholder ?? "", state: c.state, width: String(c.width), height: String(c.height), scale: String(c.scale) })}`)
  const area = page.getByRole("textbox", { name: "Test textarea" })
  if (c.referenceDirectory === "textarea-cjk") {
    await area.evaluate((node, position) => { Object.assign((node as HTMLElement).style, { position: "fixed", left: `${position.x}px`, top: `${position.y}px` }) }, { x: c.x * c.scale, y: c.y * c.scale })
    await expect(area).toHaveAttribute("data-mc-bitmap", "true")
  }
  await expect(area).toHaveAttribute("data-mc-ready", "true")
  if (c.state.startsWith("focus")) { await page.keyboard.press("Tab"); await expect(area).toBeFocused() }
  await page.mouse.move(0, 0)
  await area.evaluate((node, settings) => {
    const area = node as HTMLTextAreaElement
    area.setSelectionRange(Math.min(settings.cursor, settings.anchor), Math.max(settings.cursor, settings.anchor), settings.cursor < settings.anchor ? "backward" : "forward")
    area.scrollTop = settings.scroll
  }, { cursor: c.cursor ?? c.text.length, anchor: c.anchor ?? c.cursor ?? c.text.length, scroll: (c.value ?? 0) * c.scale })
  await page.clock.runFor(c.caretMs)
  const expectedBytes = await readFile(resolveRepositoryPath(`tests/reference/${c.referenceDirectory}/captures/${c.name}`, testRoot))
  expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actualBytes = await area.screenshot({ animations: "disabled" }), actual = PNG.sync.read(actualBytes), expected = PNG.sync.read(expectedBytes)
  const { diff, mismatchedPixels } = compare(expected, actual)
  await writeFile(testInfo.outputPath("actual.png"), actualBytes); await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff))
  await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, tolerance: 0 }, null, 2))
  expect(mismatchedPixels).toBe(0)
})
