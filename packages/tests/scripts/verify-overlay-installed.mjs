import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import {fileURLToPath} from "node:url"
import {chromium,expect} from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
const [consumerArg,nameArg,urlArg]=process.argv.slice(2)
assert.ok(consumerArg&&["sheet","drawer","alert"].includes(nameArg)&&urlArg,"Usage: bun scripts/verify-overlay-installed.mjs <consumer> <sheet|drawer|alert> <fixture-url>")
const repo=repoRoot,consumer=path.resolve(consumerArg),base=urlArg,names=[nameArg],smoke=false,hash=b=>createHash("sha256").update(b).digest("hex"),browser=await chromium.launch({channel:"msedge"})
const item=JSON.parse(fs.readFileSync(resolveRepositoryPath(path.join("registry.json")))).items.find(i=>i.name===nameArg),settings=JSON.parse(fs.readFileSync(path.join(consumer,"components.json")))
assert.ok(item)
const canonical=b=>{let t=b.toString().replace(/\/\*[\s\S]*?\*\//g,"").trim();if(settings.rsc===false)t=t.replace(/^["']use client["'];?\s*/,"");return t.replace(/^(?:\/\/[^\n]*\n\s*)+/,"")}
const files=item.files.map(entry=>{const name=path.basename(entry.path),source=fs.readFileSync(resolveRepositoryPath(path.join(entry.path))),installed=fs.readFileSync(path.join(consumer,"src/components/ui",name));assert.equal(canonical(installed),canonical(source),`${name} changed beyond CLI transforms`);return {path:name,sourceSha256:hash(source),installedSha256:hash(installed),comparison:"Identical except CLI comment removal and use-client removal for rsc:false; data URIs unchanged"}})

const report=[]
function compare(a,b){if(a.width!==b.width||a.height!==b.height)throw Error(`dimensions ${a.width}x${a.height} / ${b.width}x${b.height}`);let n=0;const diff=new PNG({width:a.width,height:a.height});for(let i=0;i<a.data.length;i+=4){const mismatch=!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4));n+=Number(mismatch);diff.data.set(mismatch?[255,0,255,255]:[a.data[i]>>2,a.data[i+1]>>2,a.data[i+2]>>2,255],i)}return {mismatchedPixels:n,diff}}
try{
 const pending=[...names];await Promise.all(Array.from({length:Math.min(2,names.length)},async()=>{while(pending.length){const name=pending.shift();
  const errors=[];let page=await browser.newPage({viewport:{width:1536,height:900},deviceScaleFactor:1}),count=0;page.on("pageerror",e=>errors.push(e.message))
  const all=[]
  for(const dir of name==="alert"?["card"]:["card","label"]){
   const folder=resolveRepositoryPath(path.join("tests/reference",dir)),m=JSON.parse(fs.readFileSync(path.join(folder,"manifest.json")))
   const cases=m.cases
   const records=[]
   for(const c of smoke?cases.slice(0,2):cases){
    const parts=dir==="label"?["title","description"]:["surface"]
    let record={name:c.name}
    for(const part of parts){
     if(count++>0&&count%64===0){await page.close();page=await browser.newPage({viewport:{width:1536,height:900},deviceScaleFactor:1});page.on("pageerror",e=>errors.push(e.message))}
     const q=new URLSearchParams({component:name,native:"1",part,width:String(c.width),height:String(c.height),scale:String(c.scale),background:c.background,x:String(c.x),y:String(c.y),align:c.alignment??"left"})
     if(c.label!=null)q.set("label",c.label);if(c.text!=null)q.set("text",c.text);if(c.wrapWidth!=null)q.set("wrapWidth",String(c.wrapWidth))
     await page.goto(`${base}?${q}`);await page.mouse.move(0,0);await page.addStyleTag({content:"#root{visibility:hidden}#subject{visibility:visible}"})
     if(name!=="alert")await page.addStyleTag({content:`[data-slot="${name}-overlay"]{visibility:hidden!important}[data-slot="${name}-content"]{visibility:hidden}#subject{visibility:visible}`})
     const target=page.locator("#subject");await expect(target).toBeVisible()
     if(dir==="label"){await expect(target).toHaveAttribute("data-mc-label-layout-ready","true");for(const line of await target.locator('[data-mc-label-ready]').all())await expect(line).toHaveAttribute('data-mc-label-ready','true')}
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
     const expectedBytes=fs.readFileSync(path.join(folder,"captures",c.name));if(hash(expectedBytes)!==c.sha256)throw Error(`reference hash ${c.name}`)
     const actualBytes=await target.screenshot({animations:"disabled"}),actual=PNG.sync.read(actualBytes),expected=PNG.sync.read(expectedBytes),result=compare(expected,actual)
     // Keep capture artifacts outside the consumer's Vite/Tailwind watch root.
     const out=resolveRepositoryPath(path.join(".native-reference","installed-verification",path.basename(consumer),name,`${part}-${c.name}`));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"metrics.json"),JSON.stringify({case:c.name,part,mismatchedPixels:result.mismatchedPixels,totalPixels:actual.width*actual.height,tolerance:0}));
     if(result.mismatchedPixels){fs.writeFileSync(path.join(out,"actual.png"),actualBytes);fs.writeFileSync(path.join(out,"diff.png"),PNG.sync.write(result.diff));throw Error(`${name} ${dir} ${part} ${c.name}: ${result.mismatchedPixels} pixels`)}
     record[part==="description"?"descriptionDecodedRgbaSha256":"decodedRgbaSha256"]=hash(actual.data);record.mismatchedPixels=0
    }
    records.push(record)
   }
   const expected=PNG.sync.read(fs.readFileSync(path.join(folder,"captures",cases[0].name))),mutated=PNG.sync.read(PNG.sync.write(expected));mutated.data[0]^=1;if(compare(expected,mutated).mismatchedPixels!==1)throw Error('Comparator negative control failed')
   all.push({manifest:`tests/reference/${dir}/manifest.json`,cases:records,negativeControlMismatchedPixels:1})
  }
  if(errors.length)throw Error(errors.join("\n"));report.push({name,browser:await browser.version(),datasets:all,pageErrors:errors});console.log(name,all.map(d=>`${d.manifest}:${d.cases.length}`).join(" "));await page.close()
 }}))
 for(const r of report)for(const dataset of r.datasets){
  const manifest=JSON.parse(fs.readFileSync(resolveRepositoryPath(path.join(dataset.manifest))))
  const proof={command:`shadcn add http://127.0.0.1:5173/r/${nameArg}.json --yes --overwrite`,consumer:"Separate initialized shadcn Vite/React consumer with independent node_modules",consumerRsc:settings.rsc,browser:r.browser,caseIsolation:"Fresh page/context every64 comparisons",devicePixelRatio:1,viewport:{width:1536,height:900},sourceJarSha256:manifest.sourceJarSha256,sourceManifest:dataset.manifest,files,cases:dataset.cases,pageErrors:r.pageErrors,negativeControlMismatchedPixels:1,renderVerificationUrl:base}
  const filename=resolveRepositoryPath(path.join("tests/reference",nameArg,dataset.manifest.includes("/card/")?"panel-installation-verification.json":"text-installation-verification.json"))
  fs.writeFileSync(filename,JSON.stringify(proof,null,2)+"\n")
 }
 console.log(`Installed ${nameArg}: all original native pixels and ${files.length} canonical source files match`)

}finally{await browser.close()}
