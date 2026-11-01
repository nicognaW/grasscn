import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import {readFile} from "node:fs/promises"
import path from "node:path"
import {createHash} from "node:crypto"
import {expect} from "@playwright/test"
import {PNG} from "pngjs"
const sha=bytes=>createHash("sha256").update(bytes).digest("hex")
export async function verifyAccordionCase({page,c,manifestFile,url,repo,componentName="accordion"}){
 const body=manifestFile==="tests/reference/label/manifest.json"
 const bytes=await readFile(resolveRepositoryPath(path.join(path.dirname(manifestFile),"captures",c.name)));assert.equal(sha(bytes),c.sha256)
 const expected=PNG.sync.read(bytes);let result
 for(const expanded of body?[true]:[false,true]){
  const params=new URLSearchParams({component:componentName,native:"1",part:body?"body":"header",label:c.label??"Button",text:body?c.label:"",width:String(c.width),height:String(c.height??20),scale:String(c.scale),state:c.state,x:String(c.x??16),y:String(c.y??16),align:c.alignment??"left"})
  if(c.wrapWidth!=null)params.set("wrapWidth",String(c.wrapWidth));if(expanded)params.set("expanded","1")
  await page.goto(`${url}?${params}`);const subject=page.locator("#subject");await expect(subject).toBeVisible()
  await page.addStyleTag({content:`html,body{background:${c.background??"#202020"}}#root{visibility:hidden}#subject{visibility:visible}`});await page.mouse.move(0,0)
  if(body)await expect(subject.locator('[data-mc-label-layout-ready]')).toHaveAttribute("data-mc-label-layout-ready","true")
  else{if(c.state==="hover")await subject.hover();if(c.state==="focus"){await subject.focus();await page.keyboard.press("Tab");await page.keyboard.press("Shift+Tab");await expect(subject).toBeFocused()}}
  for(const label of await subject.locator('[data-mc-label-ready]').all())await expect(label).toHaveAttribute("data-mc-label-ready","true")
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const bounds=await subject.boundingBox();assert.deepEqual([bounds.x,bounds.y],[(c.x??16)*c.scale,(c.y??16)*c.scale])
  const actual=PNG.sync.read(await subject.screenshot());assert.deepEqual([actual.width,actual.height],[expected.width,expected.height]);assert.ok(actual.data.equals(expected.data),`Installed Accordion pixels differ: ${c.name} expanded:${expanded}`)
  if(!result)result={name:c.name,mismatchedPixels:0,decodedRgbaSha256:sha(actual.data)}
  else result.expandedDecodedRgbaSha256=sha(actual.data)
 }
 return result
}
