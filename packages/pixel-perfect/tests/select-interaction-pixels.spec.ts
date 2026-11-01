import {resolveRepositoryPath, pixelPerfectRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFileSync, writeFileSync } from "node:fs"
import { PNG } from "pngjs"
import { compareSelectPixels } from "./select-pixel-compare"
const manifest = JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/select/manifest.json", pixelPerfectRoot), "utf8"))
for (const scale of [1, 2, 3]) for (const mode of ["pointer", "keyboard"]) test(`Select ${mode} focus preserves original list pixels at scale ${scale}`, async ({ page }, testInfo) => {
  const c = manifest.cases.find((c: any) => c.element === "select-list" && c.width === 300 && c.height === 80 && c.labels.length === 3 && c.selectedIndex === 1 && c.state === "focus" && c.background === "#202020" && c.disabledIndex == null && c.scale === scale)
  expect(c).toBeTruthy()
  await page.setViewportSize({ width: 1536, height: 900 })
  await page.goto(`/?component=select&popper=1&scale=${scale}`)
  const trigger = page.getByRole("combobox")
  if (mode === "pointer") await trigger.click()
  else { await trigger.focus(); await page.keyboard.press("ArrowDown") }
  const popup = page.locator('[data-slot="select-content"]')
  await expect(popup).toHaveAttribute("data-mc-select-ready", "true")
  await popup.evaluate((node, p) => Object.assign(node.style, { position: "fixed", left: p.x + "px", top: p.y + "px" }), { x: c.x*scale, y: c.y*scale })
  await page.addStyleTag({ content: '#root{opacity:0} [data-mc-positioner]{left:0!important;top:0!important;transform:none!important}' })
  await page.mouse.move(0, 0)
  const creative = page.getByRole("option", { name: "Creative", exact: true })
  if (mode === "pointer") await creative.hover()
  else { await expect(page.getByRole("option", { name: "Survival", exact: true })).toBeFocused(); await page.keyboard.press("ArrowDown") }
  if(mode === "keyboard") await expect(creative).toBeFocused()
  await expect(creative).toHaveAttribute("data-highlighted", "")
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText("0")
  const actualBytes = await popup.screenshot()
  const expected = PNG.sync.read(readFileSync(resolveRepositoryPath(`tests/reference/select/captures/${c.name}`, pixelPerfectRoot)))
  writeFileSync(testInfo.outputPath("actual.png"),actualBytes)
  writeFileSync(testInfo.outputPath("metrics.json"),JSON.stringify({component:"select",manifest:"tests/reference/select/manifest.json",case:c.name,part:"list",alias:mode}))
  await testInfo.attach("actual", { body: actualBytes, contentType: "image/png" })
  expect(compareSelectPixels(expected, PNG.sync.read(actualBytes)).mismatches).toBe(0)
})
