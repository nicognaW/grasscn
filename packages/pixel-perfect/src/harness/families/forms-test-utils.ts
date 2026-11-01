import {resolveRepositoryPath} from '@ppt/paths'
import {test,expect} from "@grasscn/pixel-perfect/test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"

export function compare(expected:PNG,actual:PNG){expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let mismatchedPixels=0;const diff=new PNG({width:expected.width,height:expected.height});for(let i=0;i<expected.data.length;i+=4){const mismatch=!actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4));mismatchedPixels+=+mismatch;diff.data.set(mismatch?[255,0,255,255]:[expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)}return {mismatchedPixels,diff}}

export function formsNativeTests(component:"form"|"field"){
 test.describe.configure({mode:"parallel"})
 const directories=["tests/reference/label"]
 test(`${component} pixel comparator detects a changed pixel`,()=>{const manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directories[0]}/manifest.json`),"utf8")),expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`${directories[0]}/captures/${manifest.cases[0].name}`))),mutated=PNG.sync.read(PNG.sync.write(expected));mutated.data[0]^=1;expect(compare(expected,mutated).mismatchedPixels).toBe(1)})
 for(const directory of directories){const manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`),"utf8")),parts=component==="form"?["label","description","message"]:["label","legend","title","description"]
 for(const part of parts)for(const c of manifest.cases)test(`${component} ${part} native pixels: ${c.name}`,async({page},info)=>{
  await page.setViewportSize({width:1536,height:900})
  const params=new URLSearchParams({component,native:"1",part,label:c.label??c.text??"Button",text:c.label??c.text??"Button",scale:String(c.scale),state:c.state,width:String(c.width),height:String(c.height??20),x:String(c.x??16),y:String(c.y??16),background:c.background??"#202020",align:c.alignment??"left"});if(c.wrapWidth!=null)params.set("wrapWidth",String(c.wrapWidth))
  await page.goto(`/?${params}`);const subject=page.locator("[data-subject]");await expect(subject).toBeVisible();await page.mouse.move(0,0)
  await expect(subject).toHaveAttribute("data-mc-label-layout-ready","true")
  for(const line of await subject.locator('[data-mc-label-ready]').all())await expect(line).toHaveAttribute("data-mc-label-ready","true")
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const bytes=readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`));expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256)
  const actualBytes=await subject.screenshot(),{mismatchedPixels,diff}=compare(PNG.sync.read(bytes),PNG.sync.read(actualBytes));writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("diff.png"),PNG.sync.write(diff));writeFileSync(info.outputPath("metrics.json"),JSON.stringify({component,part,case:c.name,mismatchedPixels,tolerance:0}));expect(mismatchedPixels).toBe(0)
 })}
}
