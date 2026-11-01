import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
const origin = (process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/").replace(/\/?$/, "/")

test("Grasscn project identity and native branding assets are consistent", async () => {
  for (const file of ["registry.json"]) {
    const metadata = JSON.parse(await readFile(resolveRepositoryPath(file, testRoot), "utf8"))
    expect(metadata.name).toBe("grasscn")
    if (metadata.packages?.[""]) expect(metadata.packages[""].name).toBe("grasscn")
  }
  const provenance = JSON.parse(await readFile(resolveRepositoryPath("preview/branding.provenance.json", testRoot), "utf8"))
  expect(provenance.sourceJarSha256).toBe("40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290")
  for (const [file, record] of Object.entries(provenance.generated) as [string, { sha256: string }][]) {
    const bytes = await readFile(resolveRepositoryPath(`preview/assets/${file}`, testRoot))
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256)
  }
  for (const c of provenance.cases) {
    const one = PNG.sync.read(await readFile(resolveRepositoryPath(`tests/reference/branding/native-one/${c.filename}`, testRoot)))
    const two = PNG.sync.read(await readFile(resolveRepositoryPath(`tests/reference/branding/native-two/${c.filename}`, testRoot)))
    expect(one.data.equals(two.data)).toBe(true)
    expect(c.mismatchedPixels).toBe(0)
  }
})

test("Header keeps the original grass and badge asset exact at its native capture size", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(`${origin}docs`)
  await expect(page).toHaveTitle(/grasscn/)
  const brand = page.getByRole("banner").getByRole("link", { name: "grasscn home", exact: true })
  await expect(brand).toBeVisible()
  const logo = brand.locator("img")
  await expect(logo).toHaveAttribute("src", /grasscn-logo(?:-[A-Za-z0-9_-]+)?\.svg(?:\?.*)?$/)
  await logo.evaluate(node => (node as HTMLImageElement).decode())
  await logo.evaluate(element=>{element.style.width="176px";element.style.height="64px";element.parentElement!.style.background="#000"})
  const image = PNG.sync.read(await logo.screenshot())
  expect([image.width, image.height]).toEqual([176, 64])
  const expected = PNG.sync.read(await readFile(resolveRepositoryPath("tests/reference/branding/native-one/grass-block-black-s3.png", testRoot)))
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const from = (y * 48 + x) * 4, to = ((y + 8) * image.width + x) * 4
    expect(image.data.subarray(to, to + 4).equals(expected.data.subarray(from, from + 4))).toBe(true)
  }
  const iconBytes=await page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch(document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href)).arrayBuffer())))
  expect(Buffer.from(iconBytes).equals(await readFile(resolveRepositoryPath("preview/assets/grass-block-16.png", testRoot)))).toBe(true)
  expect(errors).toEqual([])
})

test("Grasscn logo stays crisp and contained on narrow preview screens", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(`${origin}docs`)
    const logo = page.getByRole("banner").getByRole("link", { name: "grasscn home", exact: true }).locator("img")
    await expect(logo).toHaveCSS("width", "132px")
    await expect(logo).toHaveCSS("height", "48px")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
