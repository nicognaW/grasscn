import { resolveRepositoryPath, pixelPerfectRoot } from '@ppt/paths';

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";

import { readFileSync } from "node:fs";

import { readFile, writeFile } from "node:fs/promises";

import { createHash } from "node:crypto";

import { PNG } from "pngjs";

const manifest = JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/input-cjk/manifest.json", pixelPerfectRoot), "utf8")) as {
  cases: { name: string; text: string; placeholder?: string; cursor?: number; anchor?: number; caretMs: number; maxLength?: number; state: string; x: number; y: number; width: number; height: number; scale: number; sha256: string }[]
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
  const expected = PNG.sync.read(await readFile(resolveRepositoryPath(`tests/reference/input-cjk/captures/${manifest.cases[0].name}`, pixelPerfectRoot)))
  const actual = PNG.sync.read(PNG.sync.write(expected))
  actual.data[0] ^= 1
  expect(compare(expected, actual).mismatchedPixels).toBe(1)
})

for (const c of manifest.cases) test(`Input native pixels: ${c.name}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 900 })
  await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") })
  await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"))
  const query = new URLSearchParams({ component: "input", text: c.text, placeholder: c.placeholder ?? "", state: c.state, width: String(c.width), scale: String(c.scale) })
  if (c.maxLength != null) query.set("maxLength", String(c.maxLength))
  await page.goto(`/?${query}`)
  const input = page.getByRole("textbox", { name: "Test input" })
  await input.evaluate((node, position) => { Object.assign((node as HTMLElement).style, { position: "fixed", left: `${position.x}px`, top: `${position.y}px` }) }, { x: c.x * c.scale, y: c.y * c.scale })
  await expect(input).toBeVisible()
  await expect(input).toHaveAttribute("data-mc-ready", "true")
  await expect(input).toHaveAttribute("data-mc-bitmap", "true")
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
  const expectedBytes = await readFile(resolveRepositoryPath(`tests/reference/input-cjk/captures/${c.name}`, pixelPerfectRoot))
  expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actualBytes = await input.screenshot({ animations: "disabled" })
  const actual = PNG.sync.read(actualBytes), expected = PNG.sync.read(expectedBytes)
  const { diff, mismatchedPixels } = compare(expected, actual)
  await writeFile(testInfo.outputPath("actual.png"), actualBytes)
  await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff))
  await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, totalPixels: expected.width * expected.height, tolerance: 0 }, null, 2))
  expect(mismatchedPixels).toBe(0)
})
