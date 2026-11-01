import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
const manifest = JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/card/manifest.json", testRoot), "utf8")) as {
  cases: { name: string; width: number; height: number; scale: number; background: string; label?: string; text?: string; sha256: string }[]
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
test("Card comparator catches a one-pixel change", async () => {
  const expected = PNG.sync.read(await readFile(resolveRepositoryPath(`tests/reference/card/captures/${manifest.cases[0].name}`, testRoot)))
  const actual = PNG.sync.read(PNG.sync.write(expected))
  actual.data[0] ^= 1
  expect(compare(expected, actual).mismatchedPixels).toBe(1)
})
for (const c of manifest.cases) test(`Card native pixels: ${c.name}`, async ({ page }, testInfo) => {
  const query = new URLSearchParams({ component: "card", width: String(c.width), height: String(c.height), scale: String(c.scale) })
  if (c.text != null) { query.set("text", c.text); query.set("label", c.label!) }
  await page.goto(`/?${query}`)
  await page.addStyleTag({ content: `html,body { background: ${c.background}; }` })
  await page.mouse.move(0, 0)
  const card = page.locator('[data-slot="card"]')
  await expect(card).toBeVisible()
  const expectedBytes = await readFile(resolveRepositoryPath(`tests/reference/card/captures/${c.name}`, testRoot))
  expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actualBytes = await card.screenshot({ animations: "disabled" })
  const { diff, mismatchedPixels } = compare(PNG.sync.read(expectedBytes), PNG.sync.read(actualBytes))
  await writeFile(testInfo.outputPath("actual.png"), actualBytes)
  await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff))
  await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, totalPixels: c.width * c.height * c.scale * c.scale, tolerance: 0 }, null, 2))
  expect(mismatchedPixels).toBe(0)
})

test("Card keeps its ref, div attributes, content and interactive actions", async ({ page }) => {
  await page.goto("/?component=card&width=236&text=Hello&content=1&action=1")
  const card = page.getByLabel("Test card", { exact: true })
  await expect(card).toHaveAttribute("id", "subject")
  for (const slot of ["card-header", "card-title", "card-description", "card-content", "card-action", "card-footer"]) await expect(card.locator(`[data-slot="${slot}"]`)).toBeVisible()
  await page.getByLabel("Name", { exact: true }).fill("New world")
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("New world")
  await page.getByRole("button", { name: "Done", exact: true }).focus()
  await page.keyboard.press("Enter")
  await page.getByRole("button", { name: "Action", exact: true }).click()
  await expect(page.getByLabel("Activations", { exact: true })).toHaveText("2")
  await page.locator("#read-ref").click()
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("DIV")
})
