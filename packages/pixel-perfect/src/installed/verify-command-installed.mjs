import {repoRoot, resolveRepositoryPath, packageBin} from '@ppt/paths'
import assert from "node:assert/strict"
import path from "node:path"
import {readFile,writeFile,mkdir} from "node:fs/promises"
import {createHash} from "node:crypto"
import {execFileSync} from "node:child_process"
import {fileURLToPath} from "node:url"
import {chromium,expect} from "@playwright/test"
import {PNG} from "pngjs"

const [consumerArgument,url]=process.argv.slice(2)
assert.ok(consumerArgument&&url,"Usage: bun scripts/verify-command-installed.mjs <consumer-dir> <consumer-url>")
const root=repoRoot,consumer=path.resolve(consumerArgument),sha=bytes=>createHash("sha256").update(bytes).digest("hex")
const registry=JSON.parse(await readFile(resolveRepositoryPath(path.join("registry.json")),"utf8")),item=registry.items.find(item=>item.name==="command"),settings=JSON.parse(await readFile(path.join(consumer,"components.json"),"utf8")),files=[]
const canonical=bytes=>{let text=bytes.toString().replace(/\/\*[\s\S]*?\*\//g,"").trim();if(settings.rsc===false)text=text.replace(/^["']use client["'];?\s*/,"");return text.replace(/^(?:\/\/[^\n]*\n\s*)+/,"")}
for(const entry of item.files){const name=path.basename(entry.path),source=await readFile(resolveRepositoryPath(path.join(entry.path))),installed=await readFile(path.join(consumer,"src/components/ui",name));assert.equal(canonical(installed),canonical(source),`${name}: CLI changed source`);files.push({path:name,sourceSha256:sha(source),installedSha256:sha(installed),comparison:"Canonical equality except CLI comment/use-client removal; original embedded asset bytes unchanged"})}
execFileSync(process.execPath,[packageBin('typescript','tsc',consumer),"--noEmit"],{cwd:consumer,stdio:"pipe"})
await mkdir(resolveRepositoryPath(path.join("tests/reference/command")),{recursive:true})
let browser=await chromium.launch({channel:"msedge"}),count=0
const browserVersion=await browser.version()
try{
 for(const [folder,reportName] of [["suggestions","menu"],["input","input"],["input-cjk","input-cjk"]]){
  const directory=resolveRepositoryPath(path.join("tests/reference",folder)),manifest=JSON.parse(await readFile(path.join(directory,"manifest.json"),"utf8")),cases=[],pageErrors=[]
  const first=PNG.sync.read(await readFile(path.join(directory,"captures",manifest.cases[0].name))),changed=PNG.sync.read(PNG.sync.write(first));changed.data[0]^=1
  let altered=0;for(let i=0;i<first.data.length;i+=4)altered+=Number(!first.data.subarray(i,i+4).equals(changed.data.subarray(i,i+4)));assert.equal(altered,1)
  for(const c of manifest.cases){
   if(count&&count%128===0){await browser.close();browser=await chromium.launch({channel:"msedge"});assert.equal(await browser.version(),browserVersion)}
   const page=await browser.newPage({viewport:{width:folder==="input"?1280:1536,height:900},deviceScaleFactor:1});page.on("pageerror",error=>pageErrors.push(error.message))
   try{
    const menu=folder==="suggestions",query=new URLSearchParams({component:"command",native:"1",part:menu?"list":"input",scale:String(c.scale),state:c.state,width:String(c.width),height:String(c.height),x:String(c.x??16),y:String(c.y??16),background:c.background??"#202020"})
    if(menu){query.set("labels",JSON.stringify(c.labels));query.set("surface",c.element==="menu-panel"?"popup":"suggestions");query.set("selectedIndex",String(c.selectedIndex))}
    else{query.set("text",c.text);query.set("placeholder",c.placeholder??"");if(c.maxLength!=null)query.set("maxLength",String(c.maxLength));await page.clock.install({time:new Date("2026-10-28T00:00:00Z")});await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"))}
    await page.goto(`${url}?${query}`)
    const subject=page.locator(menu?'[data-slot="command-list"]':'[data-slot="command-input"]')
    if(menu){await expect(subject).toHaveAttribute("data-mc-menu-ready","true");await subject.focus();if(c.state.endsWith("hover"))await subject.getByRole("option").nth(c.targetIndex).hover();else await page.mouse.move(0,0);await subject.evaluate((node,scroll)=>{node.scrollTop=scroll},(c.value??0)*12*c.scale);await expect(subject.locator('[data-mc-menu-text-ready="false"]')).toHaveCount(0,{timeout:15_000});for(const line of await subject.locator('[data-mc-menu-unicode-ready]').all())await expect(line).toHaveAttribute('data-mc-menu-unicode-ready','true');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
    else{await expect(subject).toHaveAttribute("data-mc-ready","true");if(folder==="input-cjk")await expect(subject).toHaveAttribute("data-mc-bitmap","true");if(c.state.startsWith("focus"))await subject.focus();if(c.state==="hover")await subject.hover();else await page.mouse.move(0,0);const cursor=c.cursor??c.text.length,anchor=c.anchor??cursor;await subject.evaluate((node,{cursor,anchor})=>node.setSelectionRange(Math.min(cursor,anchor),Math.max(cursor,anchor),cursor<anchor?"backward":"forward"),{cursor,anchor});await page.clock.runFor(c.caretMs);await expect(subject).toHaveAttribute("data-mc-ready","true")}
    const expectedBytes=await readFile(path.join(directory,"captures",c.name));assert.equal(sha(expectedBytes),c.sha256)
    const expected=PNG.sync.read(expectedBytes),actual=PNG.sync.read(await subject.screenshot({animations:"disabled"}));assert.deepEqual([actual.width,actual.height],[expected.width,expected.height]);assert.ok(actual.data.equals(expected.data),`Installed Command ${folder}: ${c.name} differs`)
    cases.push({name:c.name,mismatchedPixels:0,decodedRgbaSha256:sha(actual.data)});count++
   }finally{await page.close()}
  }
  assert.deepEqual(pageErrors,[])
  const report={command:"shadcn add http://127.0.0.1:5173/r/command.json --yes --overwrite",consumer:"Separate initialized shadcn consumer with independent node_modules",consumerRsc:settings.rsc,browser:browserVersion,devicePixelRatio:1,sourceJarSha256:manifest.sourceJarSha256,files,cases,pageErrors,typecheck:{command:"tsc --noEmit",passed:true},comparatorMutationDetected:true}
  await writeFile(resolveRepositoryPath(path.join("tests/reference/command",`${reportName}-installation-verification.json`)),JSON.stringify(report,null,2)+"\n");console.log(`Installed Command ${folder}: ${cases.length} exact native cases; ${files.length} canonical sources`)
 }
}finally{await browser.close()}
