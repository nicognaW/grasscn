import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"

const manifest = JSON.parse(readFileSync("tests/reference/slider/manifest.json", "utf8")) as {
  cases: { name: string; element: string; state: string; checked: boolean; value: number; label: string; scale: number; width: number; height: number; sha256: string }[]
}

test("Slider keyboard updates controlled value and commits, including endpoints", async ({ page }) => {
  await page.goto("/?component=slider&value=500")
  const thumb = page.getByRole("slider")
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
  const bounds = (await page.locator("#subject").boundingBox())!
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
  const bounds = (await page.locator("#subject").boundingBox())!
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
  expect(form).toEqual([["volume[]", "201"], ["volume[]", "799"]])
})

test("Slider preserves uncontrolled form reset and forwarded ref", async ({ page }) => {
  await page.goto("/?component=slider&uncontrolled=1&value=500")
  const thumb = page.getByRole("slider")
  await page.keyboard.press("Tab")
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
  const root = (await page.locator("#subject").boundingBox())!, handle = (await thumb.boundingBox())!
  expect(handle.x + handle.width).toBe(root.x + root.width)
  await page.keyboard.press("Tab")
  await page.keyboard.press("ArrowLeft")
  await expect(thumb).toHaveAttribute("aria-valuenow", "1")
})

test("Vertical and inverted sliders retain native web value behavior", async ({ page }) => {
  await page.goto("/?component=slider&orientation=vertical&value=0")
  const thumb = page.getByRole("slider")
  await expect(thumb).toHaveAttribute("aria-orientation", "vertical")
  const root = (await page.locator("#subject").boundingBox())!, handle = (await thumb.boundingBox())!
  expect(handle.y + handle.height).toBe(root.y + root.height)
  await page.keyboard.press("Tab")
  await page.keyboard.press("ArrowUp")
  await expect(thumb).toHaveAttribute("aria-valuenow", "1")
  await page.goto("/?component=slider&inverted=1&value=0")
  const reversedRoot = (await page.locator("#subject").boundingBox())!, reversedHandle = (await page.getByRole("slider").boundingBox())!
  expect(reversedHandle.x + reversedHandle.width).toBe(reversedRoot.x + reversedRoot.width)
})

function compare(expected: PNG, actual: PNG) {
  if (expected.width !== actual.width || expected.height !== actual.height) throw new Error("Pixel dimensions differ")
  const diff = new PNG({ width: expected.width, height: expected.height })
  let mismatchedPixels = 0
  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !expected.data.subarray(i, i + 4).equals(actual.data.subarray(i, i + 4))
    mismatchedPixels += Number(mismatch)
    diff.data.set(mismatch ? [255, 0, 255, 255] : [expected.data[i] >> 2, expected.data[i + 1] >> 2, expected.data[i + 2] >> 2, 255], i)
  }
  return { mismatchedPixels, diff }
}

test("Control comparator detects one changed pixel", async () => {
  const expected = PNG.sync.read(await readFile(`tests/reference/slider/captures/${manifest.cases[0].name}`))
  const actual = PNG.sync.read(PNG.sync.write(expected))
  actual.data[0] ^= 1
  expect(compare(expected, actual).mismatchedPixels).toBe(1)
})

for (const reference of manifest.cases) {
  test(`Control native pixels: ${reference.name}`, async ({ page }, testInfo) => {
    const bytes = await readFile(`tests/reference/slider/captures/${reference.name}`)
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(reference.sha256)
    await page.goto(`/?${new URLSearchParams({ component: reference.element, scale: String(reference.scale), state: reference.state, value: String(Math.round(reference.value * 1000)), width: String(reference.width), label: reference.label })}`)
    const subject = page.locator("#subject")
    await expect(subject).toBeVisible()
    await page.mouse.move(0, 0)
    if (reference.state === "hover") await subject.hover()
    if (reference.state.startsWith("focus")) {
      await page.keyboard.press("Tab")
      await expect(page.getByRole("slider")).toBeFocused()
      if (reference.state === "focus-locked") await page.keyboard.press("Enter")
    }
    const actualBytes = await subject.screenshot({ animations: "disabled" })
    const expected = PNG.sync.read(bytes)
    const actual = PNG.sync.read(actualBytes)
    expect([actual.width, actual.height]).toEqual([reference.width * reference.scale, reference.height * reference.scale])
    const { mismatchedPixels, diff } = compare(expected, actual)
    await writeFile(testInfo.outputPath("actual.png"), actualBytes)
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff))
    await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: reference.name, mismatchedPixels, totalPixels: expected.width * expected.height, tolerance: 0 }, null, 2))
    expect(mismatchedPixels, "Exact match against independent vanilla rendering").toBe(0)
  })
}
