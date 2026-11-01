import { test, expect } from "./verified-test"
import { readFile, writeFile } from "node:fs/promises"
import { PNG } from "pngjs"
import { fileURLToPath } from "node:url"

test("the default MDX component page renders within the Minecraft website shell", async ({ page }, info) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"

  await page.goto(`${origin}/docs/components/button`)
  await expect(page.getByRole("heading", { name: "Button", exact: true })).toBeVisible()
  await expect(page.getByRole("paragraph").filter({ hasText: "Minecraft button with original textures, glyphs, and click feedback." })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible()
  await expect(page.getByRole("link", { name: "grasscn home" })).toHaveAttribute("href", "/")
  await expect(page.locator("[data-slot=typography-h1]")).toHaveAttribute("data-mc-label-layout-ready", "true")
  const image = await page.getByRole("button", { name: "Button", exact: true }).screenshot({ path: info.outputPath("integrated-button-actual.png") })
  const actual = PNG.sync.read(image)
  const referenceFile = fileURLToPath(new URL("./reference/captures/normal-w200-s2.png", import.meta.url))
  const reference = PNG.sync.read(await readFile(referenceFile))
  expect([actual.width, actual.height]).toEqual([reference.width, reference.height])
  let differentPixels = 0
  const diff = new PNG({ width: actual.width, height: actual.height })
  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (!actual.data.subarray(offset, offset + 4).equals(reference.data.subarray(offset, offset + 4))) {
      differentPixels++
      diff.data.set([255, 0, 0, 255], offset)
    }
  }
  const pixels = JSON.stringify({ referenceCase: "normal-w200-s2.png", differentPixels, totalPixels: actual.width * actual.height })
  await writeFile(info.outputPath("integrated-button-pixels.json"), pixels)
  await info.attach("integrated-button-actual.png", { path: info.outputPath("integrated-button-actual.png"), contentType: "image/png" })
  await info.attach("integrated-button-pixels.json", { body: Buffer.from(pixels), contentType: "application/json" })
  await writeFile(info.outputPath("integrated-button-diff.png"), PNG.sync.write(diff))
  await info.attach("integrated-button-diff.png", { path: info.outputPath("integrated-button-diff.png"), contentType: "image/png" })
  await info.attach("integrated-button-reference.png", { path: referenceFile, contentType: "image/png" })
  await page.screenshot({ path: info.outputPath("first-document-desktop.png"), fullPage: true })
  expect(differentPixels).toBe(0)
  expect(errors).toEqual([])

  // Composition review artifacts do not expand the native verified coverage.
  const desktop = { viewport: page.viewportSize(), dpr: await page.evaluate(() => devicePixelRatio) }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.screenshot({ path: info.outputPath("first-document-mobile.png"), fullPage: true })
  const mobile = { viewport: page.viewportSize(), dpr: await page.evaluate(() => devicePixelRatio) }
  await writeFile(info.outputPath("first-document-environment.json"), JSON.stringify({ desktop, mobile, browser: page.context().browser()?.version(), scope: "Website composition review only; native pixel comparison is the desktop default Button case." }, null, 2))
})
