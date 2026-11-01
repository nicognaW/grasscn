import { test, expect } from "./verified-test"
import { readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
import { labelUnihexAtlas } from "../../../apps/web/registry/ui/minecraft-label-atlas"
const manifest = JSON.parse(readFileSync("tests/reference/label/manifest.json", "utf8")) as {
  cases: { name: string; width: number; height: number; scale: number; background: string; label: string; wrapWidth?: number; alignment?: string; x: number; y: number; state: string; sha256: string }[]
}
function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  const diff = new PNG({ width: expected.width, height: expected.height })
  let mismatchedPixels = 0
  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !actual.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4))
    mismatchedPixels += Number(mismatch)
    diff.data.set(mismatch ? [255, 0, 255, 255] : [expected.data[i] >> 2, expected.data[i + 1] >> 2, expected.data[i + 2] >> 2, 255], i)
  }
  return { diff, mismatchedPixels }
}
test("Label comparator catches a one-pixel change", async () => {
  const expected = PNG.sync.read(await readFile(`tests/reference/label/captures/${manifest.cases[0].name}`))
  const actual = PNG.sync.read(PNG.sync.write(expected))
  actual.data[0] ^= 1
  expect(compare(expected, actual).mismatchedPixels).toBe(1)
})
test("Label uses the UVs observed in its native font-atlas context", () => {
  const observed = JSON.parse(readFileSync("tests/reference/label/glyph-atlas.json", "utf8"))
  expect(Object.keys(labelUnihexAtlas).sort()).toEqual(Object.keys(observed).sort())
  for (const [code, uv] of Object.entries(labelUnihexAtlas)) {
    expect(uv).toEqual(Object.fromEntries(["u0", "u1", "v0", "v1"].map(key => [key, observed[code][key]])))
  }
})
for (const c of manifest.cases) test(`Label native pixels: ${c.name}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 900 })
  const query = new URLSearchParams({ component: "label", width: String(c.width), height: String(c.height), scale: String(c.scale), label: c.label, state: c.state, alignment: c.alignment ?? "left" })
  if (c.wrapWidth != null) query.set("wrapWidth", String(c.wrapWidth))
  await page.goto(`/?${query}`)
  await page.addStyleTag({ content: `html,body { background: ${c.background}; } #root > :not([data-subject]) { visibility: hidden; } [data-subject] { position: fixed; left: ${c.x*c.scale}px; top: ${c.y*c.scale}px; }` })
  await page.mouse.move(0, 0)
  const card = page.locator('[data-slot="label"]')
  await expect(card).toHaveAttribute("data-mc-label-layout-ready", "true")
  for (const line of await card.locator('[data-mc-label-ready]').all()) await expect(line).toHaveAttribute("data-mc-label-ready", "true")
  const expectedBytes = await readFile(`tests/reference/label/captures/${c.name}`)
  expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actualBytes = await card.screenshot({ animations: "disabled" })
  const { diff, mismatchedPixels } = compare(PNG.sync.read(expectedBytes), PNG.sync.read(actualBytes))
  await writeFile(testInfo.outputPath("actual.png"), actualBytes)
  await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff))
  await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, totalPixels: c.width * c.height * c.scale * c.scale, tolerance: 0 }, null, 2))
  expect(mismatchedPixels).toBe(0)
})


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
