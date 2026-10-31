import assert from "node:assert/strict"
import {readFile,writeFile,mkdir} from "node:fs/promises"
import {createHash} from "node:crypto"
import {spawnSync} from "node:child_process"
import {fileURLToPath} from "node:url"
import path from "node:path"
import {chromium,expect} from "@playwright/test"
import {PNG} from "pngjs"

const [consumerArgument,name,url,manifestArgument,partArgument]=process.argv.slice(2)
const supported=new Set(["badge","typography","breadcrumb","kbd","empty","form","field"])
assert.ok(consumerArgument&&supported.has(name)&&url,"Usage: node scripts/verify-text-installed.mjs <consumer> <badge|typography|breadcrumb|kbd|empty> <fixture-url> [registered-manifest] [part]")
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),consumer=path.resolve(consumerArgument),json=async file=>JSON.parse(await readFile(path.join(repo,file),"utf8")),sha=bytes=>createHash("sha256").update(bytes).digest("hex")
const map=await json("registry/minecraft-map.json"),component=map.components.find(c=>c.name===name),item=(await json("registry.json")).items.find(i=>i.name===name)
assert.ok(component?.pixelVerification.manifest&&item,"Item needs registered native references")
const manifests=[component.pixelVerification.manifest,...(component.pixelVerification.additionalManifests??[])]
if(manifestArgument)assert.ok(manifests.includes(manifestArgument),"Manifest must be registered on this item")
const settings=JSON.parse(await readFile(path.join(consumer,"components.json"),"utf8")),canonical=bytes=>{let text=bytes.toString().replace(/\/\*[\s\S]*?\*\//g,"").trim();if(settings.rsc===false)text=text.replace(/^["']use client["'];?\s*/,"");return text.replace(/^(?:\/\/[^\n]*\n\s*)+/,"")},files=[]
for(const entry of item.files){const filename=path.basename(entry.path),source=await readFile(path.join(repo,entry.path)),installed=await readFile(path.join(consumer,"src/components/ui",filename));assert.equal(canonical(installed),canonical(source),`Unexpected CLI transform: ${filename}`);files.push({path:filename,sourceSha256:sha(source),installedSha256:sha(installed),comparison:"Equal except permitted CLI comments/use-client removal; embedded original resources unchanged"})}
const compiler=path.join(consumer,"node_modules/typescript/bin/tsc"),types=spawnSync(process.execPath,[compiler,"--noEmit"],{cwd:consumer,encoding:"utf8"})
assert.equal(types.status,0,`Consumer typecheck failed:\n${types.stdout??""}${types.stderr??""}`)
const groups=[]
for(const manifestFile of manifests.filter(file=>!manifestArgument||file===manifestArgument)){
 const manifest=await json(manifestFile),nativeEmpty=name==="empty"&&manifestFile===component.pixelVerification.manifest
 const allParts=name==="form"?["label","description","message"]:name==="field"?["label","legend","title","description"]:name==="typography"?["default","h1","h2","h3","h4","p","small","blockquote","code","lead","large","muted"]:name==="breadcrumb"?["link","page"]:name==="empty"&&!nativeEmpty?["title","description"]:["default"]
 if(partArgument)assert.ok(allParts.includes(partArgument),`Unsupported part for ${manifestFile}`)
 groups.push({manifestFile,manifest,parts:partArgument?[partArgument]:allParts})
}
function compare(expected,actual){assert.deepEqual([actual.width,actual.height],[expected.width,expected.height]);let mismatchedPixels=0;const diff=new PNG({width:expected.width,height:expected.height});for(let i=0;i<expected.data.length;i+=4){const mismatch=!actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4));mismatchedPixels+=+mismatch;diff.data.set(mismatch?[255,0,255,255]:[expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)}return {mismatchedPixels,diff}}
const tasks=groups.flatMap(group=>group.parts.flatMap(part=>group.manifest.cases.map(c=>({group,part,c})))),results=[],pageErrors=[],browserVersions=new Set();let next=0,completed=0
async function worker(){let browser,page,count=0
 const open=async()=>{browser=await chromium.launch({channel:"msedge"});browserVersions.add(await browser.version());assert.equal(browserVersions.size,1,"Browser changed during verification");page=await browser.newPage({viewport:{width:1536,height:900},deviceScaleFactor:1});page.on("pageerror",error=>pageErrors.push(error.message))}
 try{await open();while(next<tasks.length){const {group,part,c}=tasks[next++];if(count&&count%128===0){await browser.close();await open()}else if(count&&count%50===0){await page.close();page=await browser.newPage({viewport:{width:1536,height:900},deviceScaleFactor:1});page.on("pageerror",error=>pageErrors.push(error.message))}count++
  const params=new URLSearchParams({component:name,native:"1",part,label:c.label??c.text??"Button",text:c.label??c.text??"Button",scale:String(c.scale),state:c.state,width:String(c.width),height:String(c.height??20),x:String(c.x??16),y:String(c.y??16),background:c.background??"#202020",align:c.alignment??"left"});if(c.wrapWidth!=null)params.set("wrapWidth",String(c.wrapWidth))
  await page.goto(`${url}?${params}`);const subject=page.locator("#subject");await expect(subject).toBeVisible();await page.mouse.move(0,0)
  if(name==="kbd"){if(c.state==="hover")await subject.hover();if(c.state==="focus"){await subject.focus();await page.keyboard.press("Tab");await page.keyboard.press("Shift+Tab");await expect(subject).toBeFocused()}}
  if(name==="badge")await expect(subject.locator('[data-mc-tooltip-painted]')).toHaveAttribute("data-mc-tooltip-painted","true")
  else if(name!=="kbd"&&!(name==="empty"&&part==="default"))await expect(subject).toHaveAttribute("data-mc-label-layout-ready","true")
  for(const line of await subject.locator('[data-mc-label-ready]').all())await expect(line).toHaveAttribute("data-mc-label-ready","true")
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const bytes=await readFile(path.join(repo,path.dirname(group.manifestFile),"captures",c.name));assert.equal(sha(bytes),c.sha256);const expected=PNG.sync.read(bytes),actualBytes=await (name==="badge"?subject.locator('[data-slot="badge-surface"]'):subject).screenshot(),actual=PNG.sync.read(actualBytes),{mismatchedPixels,diff}=compare(expected,actual)
  const mutation=PNG.sync.read(PNG.sync.write(expected));mutation.data[0]^=1;assert.equal(compare(expected,mutation).mismatchedPixels,1,"Comparator failed one-pixel negative control")
  if(mismatchedPixels){const directory=path.join(consumer,".grasscn-verification",name);await mkdir(directory,{recursive:true});const id=`${part}-${c.name}`;await writeFile(path.join(directory,`actual-${id}`),actualBytes);await writeFile(path.join(directory,`diff-${id}`),PNG.sync.write(diff));await writeFile(path.join(directory,`${id}.json`),JSON.stringify({manifest:group.manifestFile,case:c.name,part,mismatchedPixels,tolerance:0}));throw new Error(`Installed ${name}/${part}/${c.name}: ${mismatchedPixels} pixels differ`)}
  results.push({manifest:group.manifestFile,part,name:c.name,mismatchedPixels,decodedRgbaSha256:sha(actual.data)});if(++completed%128===0)console.log(`${name}: ${completed}/${tasks.length} appearances exact`)
 }}finally{if(browser)await browser.close()}}
const settled=await Promise.allSettled([worker(),worker()]);for(const result of settled)if(result.status==="rejected")throw result.reason
assert.deepEqual(pageErrors,[])
for(const group of groups){const cases=group.manifest.cases.map(c=>{const rows=group.parts.map(part=>{const row=results.find(r=>r.manifest===group.manifestFile&&r.part===part&&r.name===c.name);assert.ok(row);return row});assert.ok(rows.every(r=>r.decodedRgbaSha256===rows[0].decodedRgbaSha256),`Semantic aliases changed pixels: ${c.name}`);return {name:c.name,mismatchedPixels:0,decodedRgbaSha256:rows[0].decodedRgbaSha256,...Object.fromEntries(group.parts.slice(1).map((part,index)=>[`${part}DecodedRgbaSha256`,rows[index+1].decodedRgbaSha256]))}})
 const primary=group.manifestFile===component.pixelVerification.manifest,registered=primary?component.pixelVerification.installationReport:component.pixelVerification.additionalInstallationReports?.[group.manifestFile]
 const output=partArgument?`tests/reference/${name}/diagnostic-${partArgument}.json`:registered??`tests/reference/${name}/installation-verification.json`
 await mkdir(path.dirname(path.join(repo,output)),{recursive:true})
 await writeFile(path.join(repo,output),JSON.stringify({command:`shadcn add http://127.0.0.1:5173/r/${name}.json --yes --overwrite`,consumer:"Separate initialized shadcn Vite/React consumer with independent npm dependencies",consumerRsc:settings.rsc,browser:[...browserVersions][0],viewport:[1536,900],devicePixelRatio:1,sourceJarSha256:group.manifest.sourceJarSha256,caseIsolation:"Two workers; fresh page every50 cases; browser restarted every128 cases and closed finally",typecheck:{command:"node node_modules/typescript/bin/tsc --noEmit",exitCode:0},comparatorNegativeControl:"One changed RGBA pixel detected in each native case",files,cases,pageErrors,...(partArgument?{partialPart:partArgument}:{})},null,2)+"\n")
}
console.log(`Installed ${name}: ${results.length} native appearances exact; ${files.length} sources equal; types pass; no browser errors`)
