import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import {test,expect} from "./verified-test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
function compare(expected:PNG,actual:PNG){
 expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let mismatchedPixels=0;const diff=new PNG({width:expected.width,height:expected.height})
 for(let i=0;i<expected.data.length;i+=4){const mismatch=!expected.data.subarray(i,i+4).equals(actual.data.subarray(i,i+4));mismatchedPixels+=Number(mismatch);diff.data.set(mismatch?[255,0,255,255]:[expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)}
 return {mismatchedPixels,diff}
}
for(const component of ["sheet","drawer","alert"]){
 test(`${component} pixel comparator rejects a changed pixel`,()=>{const manifest=JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/card/manifest.json", testRoot),"utf8")),expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`tests/reference/card/captures/${manifest.cases[0].name}`, testRoot))),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compare(expected,actual).mismatchedPixels).toBe(1)})
 for(const directory of component==="alert"?["card"]:["card","label"]){
  const folder=`tests/reference/${directory}`,manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${folder}/manifest.json`, testRoot),"utf8"))
  test.describe(`${component} native constituents ${directory}`,()=>{
   test.describe.configure({mode:"parallel"})
   for(const c of manifest.cases)test(`${component} native appearance: ${c.name}`,async({page},info)=>{
    await page.setViewportSize({width:1536,height:900})
    for(const part of directory==="label"?["title","description"]:["surface"]){
     const q=new URLSearchParams({component,native:"1",part,width:String(c.width),height:String(c.height),scale:String(c.scale),background:c.background,x:String(c.x),y:String(c.y),align:c.alignment??"left"})
     if(c.label!=null)q.set("label",c.label);if(c.text!=null)q.set("text",c.text);if(c.wrapWidth!=null)q.set("wrapWidth",String(c.wrapWidth))
     await page.goto(`/?${q}`)
     const subject=page.locator("[data-subject]");await expect(subject).toBeVisible()
     await expect(subject).toHaveAttribute("data-slot",component==="alert"?"alert":`${component}-${part==="surface"?"content":part}`)
     await page.addStyleTag({content:`#root{visibility:hidden}[data-subject]{visibility:visible}[data-slot="${component}-overlay"]{visibility:hidden!important}${component==="alert"?"":`[data-slot="${component}-content"]{visibility:hidden}[data-subject]{visibility:visible}`}`})
     await page.mouse.move(0,0)
     if(directory==="label"){await expect(subject).toHaveAttribute("data-mc-label-layout-ready","true");for(const label of await subject.locator('[data-mc-label-ready]').all())await expect(label).toHaveAttribute("data-mc-label-ready","true")}
     await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
     const expectedBytes=readFileSync(resolveRepositoryPath(`${folder}/captures/${c.name}`, testRoot));expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256)
     const actualBytes=await subject.screenshot({animations:"disabled"}),actual=PNG.sync.read(actualBytes),expected=PNG.sync.read(expectedBytes),{mismatchedPixels,diff}=compare(expected,actual)
     writeFileSync(info.outputPath(`${part}-actual.png`),actualBytes);writeFileSync(info.outputPath(`${part}-diff.png`),PNG.sync.write(diff));writeFileSync(info.outputPath(`${part}-metrics.json`),JSON.stringify({case:c.name,component,part,mismatchedPixels,totalPixels:actual.width*actual.height,tolerance:0}));expect(mismatchedPixels).toBe(0)
    }
   })
  })
 }
}
