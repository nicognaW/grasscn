import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import {pixelPerfectTest as test,expect} from "./verified-test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
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
const directory="tests/reference/suggestions",manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, testRoot),"utf8"))
test("Menu comparator catches one changed pixel",()=>{const expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`${directory}/captures/${manifest.cases[0].name}`, testRoot))),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compare(expected,actual).mismatchedPixels).toBe(1)})
for(const c of manifest.cases)test(`Context Menu native appearance: ${c.name}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900})
 const query=new URLSearchParams({component:"context-menu",native:"1",labels:JSON.stringify(c.labels),scale:String(c.scale),width:String(c.width),height:String(c.height),x:String(c.x),y:String(c.y),surface:c.element==="menu-panel" ? "popup" : "suggestions"})
 await page.goto(`/?${query}`);await expect(page.locator("#context-hit")).toBeVisible();await page.mouse.click(c.x*c.scale,c.y*c.scale,{button:"right"});await page.locator('[data-slot="context-menu-content"]').waitFor();await page.addStyleTag({content:`html,body{background:${c.background}} #root{visibility:hidden}`})
 const subject=page.locator('[data-slot="context-menu-content"]')
 await expect(subject).toHaveAttribute("data-mc-menu-ready","true")
 await page.mouse.move(0,0);await subject.evaluate(node=>(node as HTMLElement).focus())
 if(c.selectedIndex>=0)await subject.getByRole("menuitem").nth(c.selectedIndex).focus()
 if(c.state.endsWith("hover"))await subject.getByRole("menuitem").nth(c.targetIndex).hover()
 else await page.mouse.move(0,0)
 await subject.evaluate((node,value)=>{node.scrollTop=value},(c.value??0)*12*c.scale)
 await expect(subject.locator('[data-mc-menu-text-ready="false"]')).toHaveCount(0)
 for(const line of await subject.locator('[data-mc-menu-unicode-ready]').all())await expect(line).toHaveAttribute("data-mc-menu-unicode-ready","true")
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
 const bounds=(await subject.boundingBox())!;expect(bounds.x).toBe(c.x*c.scale);expect(bounds.y).toBe(c.y*c.scale)
 const bytes=readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, testRoot));expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256)
 const actual=await subject.screenshot(),{mismatchedPixels,diff}=compare(PNG.sync.read(bytes),PNG.sync.read(actual))
 writeFileSync(info.outputPath("actual.png"),actual);writeFileSync(info.outputPath("diff.png"),PNG.sync.write(diff));writeFileSync(info.outputPath("metrics.json"),JSON.stringify({case:c.name,mismatchedPixels,tolerance:0}))
 expect(mismatchedPixels).toBe(0)
})
