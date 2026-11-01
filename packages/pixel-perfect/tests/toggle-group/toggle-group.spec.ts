import {resolveRepositoryPath, pixelPerfectRoot} from '@ppt/paths'
import {pixelPerfectTest as test,expect} from "@grasscn/pixel-perfect/test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
const directory="tests/reference/toggle",manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot),"utf8"))
const sha=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex")
function compare(expected:PNG,actual:PNG){
 expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let mismatchedPixels=0
 const diff=new PNG({width:expected.width,height:expected.height})
 for(let i=0;i<expected.data.length;i+=4){const mismatch=!expected.data.subarray(i,i+4).equals(actual.data.subarray(i,i+4));mismatchedPixels+=Number(mismatch);diff.data.set(mismatch?[255,0,255,255]:[expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)}
 return {mismatchedPixels,diff}
}
test("Toggle Group comparator rejects one altered pixel",()=>{const expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`${directory}/captures/${manifest.cases[0].name}`, pixelPerfectRoot))),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compare(expected,actual).mismatchedPixels).toBe(1)})
test("Toggle Group embeds the original four opaque recipe-filter PNGs",()=>{
 const pins=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/asset-provenance.json`, pixelPerfectRoot),"utf8")),css=readFileSync(resolveRepositoryPath("registry/ui/minecraft-toggle-assets.css", pixelPerfectRoot),"utf8")
 const images=[...css.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map(m=>Buffer.from(m[1],"base64"))
 expect(images).toHaveLength(4)
 expect(images.map(sha).sort()).toEqual(Object.values(pins.assets).map((pin:any)=>pin.sha256).sort())
 for(const bytes of images){const p=PNG.sync.read(bytes);expect([p.width,p.height]).toEqual([26,16]);for(let i=3;i<p.data.length;i+=4)expect(p.data[i]).toBe(255)}
})
test.describe("Toggle Group native recipe-filter matrix",()=>{
 test.describe.configure({mode:"parallel"})
 for(const c of manifest.cases)for(const type of ["single","multiple"])test(`Toggle Group native pixels: ${c.name} type:${type}`,async({page},info)=>{
  await page.setViewportSize({width:1536,height:900})
  const params=new URLSearchParams({component:"toggle-group",native:"1",type,scale:String(c.scale),state:c.state,checked:String(c.checked),x:String(c.x),y:String(c.y),background:c.background})
  await page.goto(`/?${params}`);const subject=page.locator('[data-subject]');await expect(subject).toHaveAttribute('data-slot','toggle-group-item');await page.mouse.move(0,0)
  if(c.state.endsWith("hover"))await subject.hover()
  if(c.state==='focus'){await subject.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(subject).toBeFocused()}
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const bounds=(await subject.boundingBox())!;expect([bounds.x,bounds.y]).toEqual([c.x*c.scale,c.y*c.scale])
  const expectedBytes=readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, pixelPerfectRoot));expect(sha(expectedBytes)).toBe(c.sha256)
  const actualBytes=await subject.screenshot(),{mismatchedPixels,diff}=compare(PNG.sync.read(expectedBytes),PNG.sync.read(actualBytes))
  writeFileSync(info.outputPath('actual.png'),actualBytes);writeFileSync(info.outputPath('diff.png'),PNG.sync.write(diff));writeFileSync(info.outputPath('metrics.json'),JSON.stringify({case:c.name,mismatchedPixels,tolerance:0}));expect(mismatchedPixels).toBe(0)
 })
})
