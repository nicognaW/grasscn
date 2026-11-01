import {resolveRepositoryPath, pixelPerfectRoot} from '../../../workspace-paths.mjs'
import {pixelPerfectTest as test,expect} from "./verified-test"
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
test("Navigation Menu comparator detects one changed pixel",()=>{const expected=PNG.sync.read(readFileSync(resolveRepositoryPath("tests/reference/card/captures/card-c0-s1.png", pixelPerfectRoot))),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compare(expected,actual).mismatchedPixels).toBe(1)})

for(const directory of ["tests/reference/tabs","tests/reference/tabs-extra"]){
const manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot),"utf8"))
test.describe(`Navigation Menu native headers ${directory}`,()=>{
test.describe.configure({mode:"parallel"})
for(const c of manifest.cases)for(const kind of c.element==="tabs" ? ["trigger","link","indicator"] : ["trigger","link"])test(`Navigation header: ${c.name} ${kind}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900});await page.addInitScript(()=>{Date.now=()=>Number(new URLSearchParams(location.search).get("timeMs")??0)})
 const params=new URLSearchParams({component:"navigation-menu",native:"1",part:c.element,width:String(c.width),height:String(c.height),scale:String(c.scale),state:c.state,timeMs:String(c.timeMs),x:String(c.x),y:String(c.y)})
 for(const key of ["label","selected","selectedIndex","targetIndex","disabledIndex","contentHeight"])if(c[key]!=null)params.set(key,String(c[key]))
 if(c.labels)params.set("labels",JSON.stringify(c.labels));if(kind==="link")params.set("links","1");if(kind==="indicator")params.set("indicator","1")
 await page.goto(`/?${params}`);const subject=page.locator("[data-subject]");await expect(subject).toBeVisible()
 await subject.evaluate((node,p)=>Object.assign(node.style,{position:"fixed",left:p.x+"px",top:p.y+"px",width:p.width+"px",visibility:"visible"}),{x:c.x*c.scale,y:c.y*c.scale,width:c.width*c.scale})
 await page.addStyleTag({content:`html,body{background:${c.background}}#root{visibility:hidden}[data-subject]{visibility:visible}`});await page.mouse.move(0,0)
 if(c.element==="tabs-trigger"){await expect(subject).toHaveAttribute("data-mc-tab-ready","true");if(c.state.endsWith("hover"))await subject.hover();if(c.state==="focus")await subject.focus()}
 else{const list=subject.locator('[data-slot="navigation-menu-list"]');await expect(list).toHaveAttribute("data-mc-tabs-ready","true");const target=list.locator(kind==="link"?'[data-slot="navigation-menu-link"]':'[data-slot="navigation-menu-trigger"]').nth(c.targetIndex??0);if(c.state==="hover")await target.hover();if(c.state==="focus")await target.focus()}
 for(const label of await subject.locator('[data-mc-label-ready]').all())await expect(label).toHaveAttribute("data-mc-label-ready","true")
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
 const bounds=(await subject.boundingBox())!;expect([bounds.x,bounds.y]).toEqual([c.x*c.scale,c.y*c.scale])

const bytes=readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, pixelPerfectRoot));expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256)
const actualBytes=await subject.screenshot(),{diff,mismatchedPixels}=compare(PNG.sync.read(bytes),PNG.sync.read(actualBytes))
writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("diff.png"),PNG.sync.write(diff));writeFileSync(info.outputPath("metrics.json"),JSON.stringify({case:c.name,mismatchedPixels,tolerance:0}))
expect(mismatchedPixels).toBe(0)
})})}
