import {test,expect} from "./verified-test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
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
test("Navigation Menu row comparator detects one changed pixel",()=>{const expected=PNG.sync.read(readFileSync("tests/reference/card/captures/card-c0-s1.png")),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compare(expected,actual).mismatchedPixels).toBe(1)})

const directory="tests/reference/suggestions",manifest=JSON.parse(readFileSync(`${directory}/manifest.json`,"utf8"))
test.describe("Navigation Menu native link rows",()=>{
test.describe.configure({mode:"parallel"})
for(const c of manifest.cases)for(const inline of [false,true])test(`Navigation rows: ${c.name} inline:${inline}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900})
 const params=new URLSearchParams({component:"navigation-menu",panel:"1",mode:"rows",labels:JSON.stringify(c.labels),surface:c.element==="menu-panel"?"popup":"suggestions",width:String(c.width),height:String(c.height),scale:String(c.scale),x:String(c.x),y:String(c.y)});if(inline)params.set("noViewport","1")
 await page.goto(`/?${params}`);const subject=page.locator("#subject");await expect(subject).toHaveAttribute("data-mc-menu-ready","true")
 await page.addStyleTag({content:`html,body{background:${c.background}}#root{visibility:hidden}#subject{visibility:visible}`});await page.mouse.move(0,0);await subject.focus()
 if(c.selectedIndex>=0)await subject.getByRole("link").nth(c.selectedIndex).focus()
 if(c.state.endsWith("hover")){await subject.focus();await subject.getByRole("link").nth(c.targetIndex).hover()}
 await subject.evaluate((node,value)=>{node.scrollTop=value},(c.value??0)*12*c.scale)
 await expect(subject.locator('[data-mc-menu-text-ready="false"]')).toHaveCount(0)
 for(const label of await subject.locator('[data-mc-menu-unicode-ready]').all())await expect(label).toHaveAttribute("data-mc-menu-unicode-ready","true")
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
 const bounds=(await subject.boundingBox())!;expect([bounds.x,bounds.y]).toEqual([c.x*c.scale,c.y*c.scale])

const bytes=readFileSync(`${directory}/captures/${c.name}`);expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256)
const actualBytes=await subject.screenshot(),{diff,mismatchedPixels}=compare(PNG.sync.read(bytes),PNG.sync.read(actualBytes))
writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("diff.png"),PNG.sync.write(diff));writeFileSync(info.outputPath("metrics.json"),JSON.stringify({case:c.name,mismatchedPixels,tolerance:0}))
expect(mismatchedPixels).toBe(0)
})})
