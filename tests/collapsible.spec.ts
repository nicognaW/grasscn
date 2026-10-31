import {test,expect} from "./verified-test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
function compareRgba(expected:PNG,actual:PNG){
 expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let mismatchedPixels=0;const diff=new PNG({width:expected.width,height:expected.height})
 for(let i=0;i<expected.data.length;i+=4){const mismatch=!actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4));mismatchedPixels+=Number(mismatch);diff.data.set(mismatch?[255,0,255,255]:[expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)}
 return {mismatchedPixels,diff}
}
test("Collapsible comparator detects one changed pixel",()=>{const expected=PNG.sync.read(readFileSync("tests/reference/captures/normal-w200-s1.png")),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compareRgba(expected,actual).mismatchedPixels).toBe(1)})
for(const directory of ["tests/reference","tests/reference/button-cjk","tests/reference/label"]){
 const manifest=JSON.parse(readFileSync(`${directory}/manifest.json`,"utf8")),body=directory.endsWith("/label")
 test.describe(`Collapsible native matrix ${directory}`,()=>{
 test.describe.configure({mode:"parallel"})
 for(const c of manifest.cases)for(const expanded of body?[true]:[false,true])test(`Collapsible pixels: ${c.name} expanded:${expanded}`,async({page},info)=>{
  await page.setViewportSize({width:1536,height:900})
  const params=new URLSearchParams({component:"collapsible",native:"1",part:body?"body":"header",label:c.label??"Button",text:body?c.label:"",width:String(c.width),height:String(c.height??20),scale:String(c.scale),state:c.state,x:String(c.x??16),y:String(c.y??16),align:c.alignment??"left"})
  if(c.wrapWidth!=null)params.set("wrapWidth",String(c.wrapWidth));if(expanded)params.set("expanded","1")
  await page.goto(`/?${params}`);const subject=page.locator("#subject");await expect(page.locator('[data-slot="collapsible"]')).toHaveCount(1);await expect(subject).toBeVisible()
  await page.addStyleTag({content:`html,body{background:${c.background??"#202020"}}#root{visibility:hidden}#subject{visibility:visible}`});await page.mouse.move(0,0)
  if(body)await expect(subject.locator('[data-mc-label-layout-ready]')).toHaveAttribute("data-mc-label-layout-ready","true")
  else{if(c.state==="hover")await subject.hover();if(c.state==="focus"){await subject.focus();await page.keyboard.press("Tab");await page.keyboard.press("Shift+Tab");await expect(subject).toBeFocused()}}
  for(const label of await subject.locator('[data-mc-label-ready]').all())await expect(label).toHaveAttribute("data-mc-label-ready","true")
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const bounds=(await subject.boundingBox())!;expect([bounds.x,bounds.y]).toEqual([(c.x??16)*c.scale,(c.y??16)*c.scale])
  const expectedBytes=readFileSync(`${directory}/captures/${c.name}`);expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
  const actualBytes=await subject.screenshot(),actual=PNG.sync.read(actualBytes),expected=PNG.sync.read(expectedBytes)
  const {mismatchedPixels,diff}=compareRgba(expected,actual)
  writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("diff.png"),PNG.sync.write(diff));writeFileSync(info.outputPath("metrics.json"),JSON.stringify({case:c.name,expanded,mismatchedPixels,tolerance:0}));expect(mismatchedPixels).toBe(0)
 })})
}
