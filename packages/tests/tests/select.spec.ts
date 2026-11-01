import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
import { compareSelectPixels } from "./select-pixel-compare"
const directory = "tests/reference/select"
const manifest = JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, testRoot), "utf8")) as { cases: { name: string; element: string; label?: string; labels?: string[]; width: number; height: number; x: number; y: number; scale: number; state: string; selectedIndex?: number; value?: number; timeMs?: number; background: string; targetIndex?: number; disabledIndex?: number; sha256: string }[] }
test("Select comparator catches a one-pixel change", () => {
  const expected = PNG.sync.read(readFileSync(resolveRepositoryPath(`${directory}/captures/${manifest.cases[0].name}`, testRoot)))
  const actual = PNG.sync.read(PNG.sync.write(expected)); actual.data[0] ^= 1
  expect(compareSelectPixels(expected, actual).mismatches).toBe(1)
})
test.describe("Select native matrix", () => {
 test.describe.configure({ mode: "parallel" })
for (const c of manifest.cases) test(`Select native pixels: ${c.name}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 900 })
  await page.addInitScript(() => { Date.now = () => Number(new URLSearchParams(location.search).get("timeMs") ?? 0) })
  const query = new URLSearchParams({ component: c.element, width: String(c.width), height: String(c.height), scale: String(c.scale), state: c.state, timeMs: String(c.timeMs ?? 0) })
  if (c.label != null) query.set("label", c.label)
  if (c.labels) query.set("labels", JSON.stringify(c.labels))
  if (c.selectedIndex != null) query.set("selectedIndex", String(c.selectedIndex))
  if (c.disabledIndex != null) query.set("disabledIndex", String(c.disabledIndex))
  await page.goto(`/?${query}`)
  const subject = page.locator("[data-subject]")
  await expect(subject).toBeVisible()
  await page.addStyleTag({ content: `html,body{background:${c.background}} #root{visibility:hidden;${c.element === "select-list" ? "opacity:0;" : ""}} [data-subject]{visibility:visible} [data-mc-positioner]{left:0!important;top:0!important;transform:none!important}` })
  await subject.evaluate((node, p) => Object.assign(node.style, { position: "fixed", left: p.x + "px", top: p.y + "px", width: p.width + "px", height: p.height + "px" }), { x: c.x*c.scale, y: c.y*c.scale, width: c.width*c.scale, height: c.height*c.scale })
  await expect(subject).toHaveAttribute("data-mc-select-ready", "true")
  await page.mouse.move(0, 0)
  if (c.state === "focus") await subject.focus()
  else await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  if (c.state.endsWith("hover")) await (c.element === "select-list" ? subject.getByRole("option").nth(c.targetIndex ?? 0) : subject).hover()
  // Minecraft hover probes keep the list unfocused; Base UI pointer focus is tested separately.
  if (c.element === "select-list" && c.state !== "focus") await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  if (c.element === "select-list") await subject.locator('[data-slot="select-viewport"]').evaluate((node, scroll) => { node.scrollTop = scroll }, (c.value ?? 0)*c.scale)
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  for (const label of await subject.locator("[data-mc-label-ready]").all()) await expect(label).toHaveAttribute("data-mc-label-ready", "true")
  const actualBytes = await subject.screenshot()
  writeFileSync(testInfo.outputPath("actual.png"), actualBytes)
  const expectedBytes = readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, testRoot))
  expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const expected = PNG.sync.read(expectedBytes), actual = PNG.sync.read(actualBytes)
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  const { diff, mismatches } = compareSelectPixels(expected, actual)
  writeFileSync(testInfo.outputPath("diff.png"),PNG.sync.write(diff))
  writeFileSync(testInfo.outputPath("metrics.json"),JSON.stringify({case:c.name,mismatchedPixels:mismatches,totalPixels:actual.width*actual.height,tolerance:0}))
  await testInfo.attach("actual", { body: actualBytes, contentType: "image/png" })
  expect(mismatches).toBe(0)
})

})
