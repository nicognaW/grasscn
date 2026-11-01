import {repoRoot, resolveRepositoryPath} from '../../../workspace-paths.mjs'
import{chromium,expect}from"@playwright/test"
import fs from"node:fs"
import path from"node:path"
import assert from"node:assert/strict"
import{fileURLToPath}from"node:url"
import{PNG}from"pngjs"
import{createHash}from"node:crypto"
const [consumerArg,componentArg,urlArg]=process.argv.slice(2)
assert.ok(consumerArg&&["sonner"].includes(componentArg)&&urlArg,"Usage: bun scripts/verify-toast-installed.mjs <consumer> <sonner> <fixture-url>")
const repo=repoRoot,consumer=path.resolve(consumerArg),ref=resolveRepositoryPath(path.join("tests/reference/toast")),manifest=JSON.parse(fs.readFileSync(`${ref}/manifest.json`)),smoke=false,cases=manifest.cases,results=[]

const sha=b=>createHash("sha256").update(b).digest("hex")
const item=JSON.parse(fs.readFileSync(resolveRepositoryPath(path.join("registry.json")))).items.find(i=>i.name===componentArg),settings=JSON.parse(fs.readFileSync(path.join(consumer,"components.json")))
assert.ok(item)
const canonical=bytes=>{let t=bytes.toString().replace(/\/\*[\s\S]*?\*\//g,"").trim();if(settings.rsc===false)t=t.replace(/^["']use client["'];?\s*/,"");return t.replace(/^(?:\/\/[^\n]*\n\s*)+/,"")}
const files=item.files.map(file=>{const basename=path.basename(file.path),installedPath=file.type==="registry:hook"?`src/hooks/${basename}`:`src/components/ui/${basename}`,source=fs.readFileSync(resolveRepositoryPath(path.join(file.path))),installed=fs.readFileSync(path.join(consumer,installedPath));assert.equal(canonical(installed),canonical(source),`${file.path} changed beyond CLI transforms`);return {path:basename,...(file.type==="registry:hook"?{sourcePath:file.path}:{}),installedPath,sourceSha256:sha(source),installedSha256:sha(installed),comparison:"Identical except CLI comments and use-client removal for rsc:false; embedded assets unchanged"}})
const comparator=(a,b)=>{assert.deepEqual([a.width,a.height],[b.width,b.height]);let n=0;for(let i=0;i<a.data.length;i+=4)if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))n++;return n}
const control=PNG.sync.read(fs.readFileSync(`${ref}/captures/${manifest.cases[0].name}`)),mutation=PNG.sync.read(PNG.sync.write(control));mutation.data[0]^=1;assert.equal(comparator(control,mutation),1)
const browser=await chromium.launch({channel:"msedge"})

try{
 let page,index=0,errors=[]
 for(const c of cases){
  if(index++%64===0){if(page)await page.close();page=await browser.newPage({viewport:{width:1536,height:900},deviceScaleFactor:1});page.on("pageerror",e=>errors.push(e.message));await page.clock.install({time:new Date("2026-10-30T00:00:00Z")});await page.clock.pauseAt(new Date("2026-10-30T00:00:01Z"))}
  errors=[]
  const component=componentArg
  const q=new URLSearchParams({component,native:"1",label:c.label,width:String(c.width),height:String(c.height),scale:String(c.scale),background:c.background,x:String(c.x),y:String(c.y),count:String(c.selectedIndex??1)})
  if(c.text!=null)q.set("text",c.text)
  await page.goto(`${urlArg}?${q}`)
  if(component==="sonner")await expect(page.locator("#created")).toHaveText(String(c.selectedIndex??1))
  await page.clock.fastForward(0)
  await page.addStyleTag({content:'#root{visibility:hidden}#subject,[data-sonner-toast],.mc-sonner-ghost{visibility:visible}'})
  const subject=page.locator("#subject");await expect(subject).toBeVisible();await expect(page.locator(component==="sonner"?'[data-sonner-toast]':'[data-slot="toast"]')).toHaveCount(c.selectedIndex??1)
  await expect(page.locator('[data-mc-toast-ready]')).toHaveCount(c.selectedIndex??1)
  for(const canvas of await page.locator('[data-mc-toast-ready]').all())await expect(canvas).toHaveAttribute('data-mc-toast-ready','true')
  if(c.state==="exiting"){await page.clock.fastForward(600);await page.locator("#close").evaluate(n=>n.click());await page.clock.fastForward(component==="sonner"?16:0);await expect(page.locator(component==="sonner"?'[data-sonner-toast]':'[data-slot="toast"]').first()).toHaveAttribute(component==="sonner"?"data-removed":"data-state",component==="sonner"?"true":"closed")}
  await page.clock.fastForward(c.timeMs)
  if(c.state!=="exiting"||c.timeMs<600){await expect(page.locator('[data-mc-toast-ready]')).toHaveCount(c.selectedIndex??1);for(const canvas of await page.locator('[data-mc-toast-ready]').all())await expect(canvas).toHaveAttribute('data-mc-toast-ready','true')}
  await page.evaluate(()=>window.dispatchEvent(new Event("resize")))
  const actualBytes=await subject.screenshot({animations:"disabled"}),actual=PNG.sync.read(actualBytes),expectedBytes=fs.readFileSync(`${ref}/captures/${c.name}`),expected=PNG.sync.read(expectedBytes)
  if(sha(expectedBytes)!==c.sha256)throw Error(`Native reference changed ${c.name}`)
  if(actual.width!==expected.width||actual.height!==expected.height)throw Error(`Dimensions ${c.name}: ${actual.width}x${actual.height} / ${expected.width}x${expected.height}`)
  const mismatchedPixels=comparator(expected,actual);const diff=new PNG({width:actual.width,height:actual.height});for(let i=0;i<actual.data.length;i+=4){const mismatch=!actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4));diff.data.set(mismatch?[255,0,255,255]:[expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)}
  if(mismatchedPixels){const out=path.join(consumer,"verification-results",componentArg);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,`actual-${c.name}`),actualBytes);fs.writeFileSync(path.join(out,`diff-${c.name}`),PNG.sync.write(diff));console.log(c.name,mismatchedPixels,JSON.stringify(await page.locator('[data-slot="toast"]').evaluateAll(nodes=>nodes.map(n=>({rect:n.getBoundingClientRect().toJSON(),text:n.textContent})))))}
  results.push({name:c.name,mismatchedPixels,decodedRgbaSha256:sha(actual.data),pageErrors:errors});if(index%64===0)console.log("Compared",index,"native cases")
 }

 assert.ok(results.every(c=>c.mismatchedPixels===0),"Installed pixels differ");assert.deepEqual(results.flatMap(c=>c.pageErrors),[])
 const report={command:`shadcn add http://127.0.0.1:5173/r/${componentArg}.json --yes --overwrite`,consumer:"Separate initialized Vite/React shadcn consumer with independent node_modules",consumerRsc:settings.rsc,browser:browser.version(),devicePixelRatio:1,viewport:{width:1536,height:900},caseIsolation:"Fresh page/context every64 cases",sourceJarSha256:manifest.sourceJarSha256,sourceManifest:"tests/reference/toast/manifest.json",files,cases:results.map(({name,mismatchedPixels,decodedRgbaSha256})=>({name,mismatchedPixels,decodedRgbaSha256})),pageErrors:[],negativeControlMismatchedPixels:1,clock:"Paused browser clock, exact600ms squared native phase via fastForward and resize event",renderVerificationUrl:urlArg}
 const target=resolveRepositoryPath(path.join("tests/reference",componentArg));fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,"installation-verification.json"),JSON.stringify(report,null,2)+"\n")
 console.log(`Installed ${componentArg}: ${results.length} native cases match exactly; ${files.length} canonical source files and one-pixel comparator control verified`)

}finally{await browser.close()}
