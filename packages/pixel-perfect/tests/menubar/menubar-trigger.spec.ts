import {resolveRepositoryPath, pixelPerfectRoot} from '@ppt/paths'
import {pixelPerfectTest as test,expect} from "@grasscn/pixel-perfect/test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
  const diff = new PNG({ width: expected.width, height: expected.height })
  let mismatchedPixels = 0
  for (let i = 0; i < expected.data.length; i += 4) {
    const different = !actual.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4))
    mismatchedPixels += Number(different)
    diff.data.set(different ? [255, 0, 255, 255] : [expected.data[i] >> 2, expected.data[i + 1] >> 2, expected.data[i + 2] >> 2, 255], i)
  }
  return { diff, mismatchedPixels }
}
test("Menubar trigger comparator catches one changed pixel",()=>{
 const expected=PNG.sync.read(readFileSync(resolveRepositoryPath("tests/reference/captures/normal-w200-s1.png", pixelPerfectRoot))),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compare(expected,actual).mismatchedPixels).toBe(1)
})
for(const directory of ["tests/reference","tests/reference/button-cjk"]){
 const manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot),"utf8"))
 for(const c of manifest.cases)for(const open of c.state==="hover" ? [false,true] : [false])test(`Menubar trigger native pixels: ${c.name} open:${open}`,async({page},info)=>{
  await page.setViewportSize({width:1536,height:900})
  const params=new URLSearchParams({component:"menubar",triggerPixels:"1",label:c.label,scale:String(c.scale),width:String(c.width),state:open ? "normal":c.state,x:String(c.x??16),y:String(c.y??16)})
  if(open)params.set("open","1")
  await page.goto(`/?${params}`)
  const trigger=page.locator('[data-slot="menubar-trigger"]').first();await expect(trigger).toBeVisible()
  await page.addStyleTag({content:'[data-slot="menubar-content"]{visibility:hidden}'})
  await page.mouse.move(0,0)
  if(c.state==="hover"&&!open)await trigger.hover()
  if(c.state==="focus"){await page.keyboard.press("Tab");await expect(trigger).toBeFocused()}
  for(const line of await trigger.locator('[data-mc-label-ready]').all())await expect(line).toHaveAttribute("data-mc-label-ready","true")
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const bounds=(await trigger.boundingBox())!;expect([bounds.x,bounds.y]).toEqual([(c.x??16)*c.scale,(c.y??16)*c.scale])
  const expectedBytes=readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, pixelPerfectRoot));expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actualBytes=await trigger.screenshot(),{diff,mismatchedPixels}=compare(PNG.sync.read(expectedBytes),PNG.sync.read(actualBytes))
  writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("diff.png"),PNG.sync.write(diff));writeFileSync(info.outputPath("metrics.json"),JSON.stringify({case:c.name,open,mismatchedPixels,tolerance:0}))
  expect(mismatchedPixels).toBe(0)
 })
}
