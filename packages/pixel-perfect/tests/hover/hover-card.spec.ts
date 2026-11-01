import {resolveRepositoryPath, pixelPerfectRoot} from '@ppt/paths'
import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test"
import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"

function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  const diff = new PNG({ width: expected.width, height: expected.height })
  let mismatchedPixels = 0
  for (let i = 0; i < actual.data.length; i += 4) {
    const mismatch = !actual.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4))
    mismatchedPixels += Number(mismatch)
    diff.data.set(mismatch ? [255, 0, 255, 255] : [expected.data[i] >> 2, expected.data[i + 1] >> 2, expected.data[i + 2] >> 2, 255], i)
  }
  return { mismatchedPixels, diff }
}
test("Hover Card comparator catches one changed pixel", () => {
  const manifest = JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/tooltip/manifest.json", pixelPerfectRoot), "utf8"))
  const expected = PNG.sync.read(readFileSync(resolveRepositoryPath(`tests/reference/tooltip/captures/${manifest.cases[0].name}`, pixelPerfectRoot)))
  const actual = PNG.sync.read(PNG.sync.write(expected))
  actual.data[0] ^= 1
  expect(compare(expected, actual).mismatchedPixels).toBe(1)
})
for (const directory of ["tests/reference/tooltip", "tests/reference/hover-card"]) {
  const manifest = JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot), "utf8"))
  for (const c of manifest.cases) test(`Hover Card native pixels: ${c.name}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1536, height: 900 })
    await page.goto(`/?${new URLSearchParams({ component: "hover-card", native: "1", text: c.text, wrapWidth: String(c.wrapWidth), scale: String(c.scale), x: String(c.x), y: String(c.y) })}`)
    await page.addStyleTag({ content: `html,body{background:${c.background}} #root{visibility:hidden}` })
    const subject = page.locator('[data-slot="hover-card-content"]')
    await expect(subject).toHaveAttribute("data-mc-hover-card-ready", "true")
    await expect(subject).toHaveAttribute("data-mc-hover-card-text-ready", "true")
    const painter = subject.locator('canvas[data-mc-tooltip-painted]')
    await expect(painter).toHaveAttribute("data-mc-tooltip-painted", "true")
    await expect(painter).toHaveAttribute("data-mc-backdrop", [1, 3, 5].map(start => parseInt(c.background.slice(start, start + 2), 16)).join(","))
    await expect(painter).toHaveAttribute("data-mc-location", `${c.x * c.scale},${c.y * c.scale}`)
    for (const line of await subject.locator('[data-mc-hover-card-unicode-ready]').all()) await expect(line).toHaveAttribute("data-mc-hover-card-unicode-ready", "true")
    await page.mouse.move(0, 0)
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const bounds = (await subject.boundingBox())!
    expect(bounds.x).toBe(c.x * c.scale)
    expect(bounds.y).toBe(c.y * c.scale)
    const bytes = readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, pixelPerfectRoot))
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256)
    const actual = await subject.screenshot(), { mismatchedPixels, diff } = compare(PNG.sync.read(bytes), PNG.sync.read(actual))
    writeFileSync(info.outputPath("actual.png"), actual)
    writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff))
    writeFileSync(info.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, tolerance: 0 }))
    expect(mismatchedPixels).toBe(0)
  })
}
