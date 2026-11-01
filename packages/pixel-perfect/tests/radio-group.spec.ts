import {resolveRepositoryPath, pixelPerfectRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
const directory = "tests/reference/radio-group"
const manifest = JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot), "utf8"))
function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  const diff = new PNG({ width: expected.width, height: expected.height })
  let mismatchedPixels = 0
  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !expected.data.subarray(i, i + 4).equals(actual.data.subarray(i, i + 4))
    mismatchedPixels += Number(mismatch)
    diff.data.set(mismatch ? [255,0,255,255] : [expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)
  }
  return { diff, mismatchedPixels }
}
test("Radio Group comparator catches a changed pixel", () => {
  const expected = PNG.sync.read(readFileSync(resolveRepositoryPath(`${directory}/captures/${manifest.cases[0].name}`, pixelPerfectRoot))), actual = PNG.sync.read(PNG.sync.write(expected))
  actual.data[0] ^= 1
  expect(compare(expected,actual).mismatchedPixels).toBe(1)
})
for (const c of manifest.cases) test(`Radio Group native pixels: ${c.name}`, async ({ page }, testInfo) => {
  await page.goto(`/?component=radio-group-item&checked=${c.checked}&state=${c.state}&scale=${c.scale}`)
  const subject = page.locator("[data-subject]")
  await expect(subject).toBeVisible()
  await subject.evaluate((node,c)=>Object.assign(node.style,{position:"fixed",left:`${c.x*c.scale}px`,top:`${c.y*c.scale}px`}),c)
  await page.addStyleTag({content:`html,body{background:${c.background}} #root{visibility:hidden} [data-subject]{visibility:visible}`})
  await page.mouse.move(0,0)
  if(c.state === "focus") await subject.focus()
  if(c.state === "hover") await subject.hover()
  const expectedBytes = readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, pixelPerfectRoot))
  expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actual = await subject.screenshot()
  const {diff,mismatchedPixels} = compare(PNG.sync.read(expectedBytes),PNG.sync.read(actual))
  writeFileSync(testInfo.outputPath("actual.png"),actual)
  writeFileSync(testInfo.outputPath("diff.png"),PNG.sync.write(diff))
  writeFileSync(testInfo.outputPath("metrics.json"),JSON.stringify({case:c.name,mismatchedPixels,totalPixels:c.width*c.height*c.scale*c.scale,tolerance:0}))
  expect(mismatchedPixels).toBe(0)
})
