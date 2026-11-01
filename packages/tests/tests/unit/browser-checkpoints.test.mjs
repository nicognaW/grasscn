import {testRoot} from '@grasscn/tests/paths'
import {packageBin} from '@grasscn/tests/paths'
import {test} from "bun:test"
import assert from "node:assert/strict"
import {mkdtemp,mkdir,readFile,writeFile,rm} from "node:fs/promises"
import {createHash} from "node:crypto"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {spawnSync} from "node:child_process"
import {browserFilePattern,reusableBrowserTests} from "@grasscn/tests/checkpoints"

test("browser file filters select exact basenames on Windows and POSIX",()=>{
  const pattern=new RegExp(browserFilePattern("select.spec.ts"))
  assert.ok(pattern.test("C:\\repo\\tests\\select.spec.ts"))
  assert.ok(pattern.test("/repo/tests/select.spec.ts"))
  assert.equal(pattern.test("/repo/tests/native-select.spec.ts"),false)
  assert.equal(pattern.test("/repo/tests/selectXspec.ts"),false)
})

async function fixture(run){
  const parent=path.join(testRoot,'test-results',"unit");await mkdir(parent,{recursive:true})
  const root=await mkdtemp(path.join(parent,"browser-cache-")),file="sample.spec.ts",directory=path.join(root,"prior/checkpoints",file),output=path.join(root,"prior/browser/sample")
  try{
    await mkdir(directory,{recursive:true});await mkdir(output,{recursive:true});await mkdir(path.join(root,"tests"))
    await writeFile(path.join(root,"tests",file),"stable source")
    const hash=value=>createHash("sha256").update(value).digest("hex"),id="test-id",record={id,file:"tests/"+file,title:["",file,"suite","case"],status:"passed",expectedStatus:"passed",retry:0,sourceChanged:false,verification:{outputDirectory:output,artifacts:[{file:"actual.png",pngSha256:hash("rendered bytes")}]}}
    await writeFile(path.join(output,"actual.png"),"rendered bytes")
    await writeFile(path.join(directory,"expected.json"),JSON.stringify({schemaVersion:2,rootDir:path.join(root,"tests"),tests:[{id,sourceSha256:hash("stable source")}]}))
    const journal=path.join(directory,"results.jsonl"),candidate={filename:path.join(root,"prior/verification.json"),report:{startedAt:"2026-10-31T00:00:00Z"}}
    const save=records=>writeFile(journal,records.map(record=>JSON.stringify(record)).join("\n")+"\n")
    await run({root,file,record,journal,save,candidate,output})
  }finally{assert.equal(path.dirname(root),parent);await rm(root,{recursive:true,force:true})}
}

test("checkpoints retain only source-identical successful tests and intact artifacts",()=>fixture(async({root,file,record,save,candidate,output})=>{
  await save([record]);let retained=await reusableBrowserTests([candidate],file,root)
  assert.equal(retained.length,1);assert.equal(retained[0].line,"[] › sample.spec.ts › suite › case")
  await writeFile(path.join(output,"actual.png"),"changed bytes")
  assert.deepEqual(await reusableBrowserTests([candidate],file,root),[])
  await writeFile(path.join(output,"actual.png"),"rendered bytes")
  await writeFile(path.join(root,"tests",file),"changed source")
  assert.deepEqual(await reusableBrowserTests([candidate],file,root),[])
}))

test("failures and retries supersede earlier passes; interrupted writes do not create passes",()=>fixture(async({root,file,record,save,candidate,journal})=>{
  for(const failed of [{...record,status:"failed"},{...record,retry:1}]){
    await save([record,failed]);assert.deepEqual(await reusableBrowserTests([candidate],file,root),[])
  }
  await writeFile(journal,JSON.stringify(record)+"\n"+'{"id":"unfinished"')
  assert.equal((await reusableBrowserTests([candidate],file,root)).length,1)
  await writeFile(journal,'{"id":"unfinished"\n'+JSON.stringify(record)+"\n")
  assert.deepEqual(await reusableBrowserTests([candidate],file,root),[])
}))

test("a corrupt newer journal cannot recover an older pass",()=>fixture(async({root,file,record,save,candidate})=>{
  await save([record])
  const directory=path.join(root,"newer/checkpoints",file)
  await mkdir(directory,{recursive:true})
  await writeFile(path.join(directory,"expected.json"),await readFile(path.join(root,"prior/checkpoints",file,"expected.json")))
  await writeFile(path.join(directory,"results.jsonl"),'corrupt interior record\n'+JSON.stringify(record)+"\n")
  const newer={filename:path.join(root,"newer/verification.json"),report:{startedAt:"2026-10-31T00:00:01Z"}}
  assert.deepEqual(await reusableBrowserTests([candidate,newer],file,root),[])
}))

test("Playwright can retain a complete file without repeating its tests",()=>fixture(async({root,file,candidate})=>{
  const reporter=fileURLToPath(import.meta.resolve("@grasscn/tests/checkpoint-reporter"))
  await writeFile(path.join(root,"playwright.config.mjs"),'export default {testDir:"./tests",workers:1};')
  await writeFile(path.join(root,"tests",file),'import {test,expect} from "@playwright/test";import {appendFileSync} from "node:fs";for(const name of ["first","second"])test(name,()=>{appendFileSync("runs.txt",name+"\\n");expect(name.length).toBeGreaterThan(0)});')
  const run=(args,env={})=>{
    const result=spawnSync(process.execPath,[packageBin("@playwright/test", "playwright"),"test","--config=playwright.config.mjs",...args],{cwd:root,encoding:"utf8",env:{...process.env,...env}})
    assert.equal(result.status,0,result.stdout+result.stderr)
  }
  run(["--reporter=list,"+reporter,"--output="+path.join(root,"prior/browser")],{GRASSCN_CHECKPOINT_REPORT_DIR:path.join(root,"prior/checkpoints",file)})
  const retained=await reusableBrowserTests([candidate],file,root)
  assert.equal(retained.length,2)
  const list=path.join(root,"retained.txt")
  await writeFile(list,retained.map(record=>record.line).join("\n")+"\n")
  run(["--test-list-invert",list,"--pass-with-no-tests","--output="+path.join(root,"second/browser")])
  assert.deepEqual((await readFile(path.join(root,"runs.txt"),"utf8")).trim().split("\n"),["first","second"])
}))


test("nested browser file filters match the same exact case path on Windows and POSIX",()=>{
 const pattern=new RegExp(browserFilePattern("button/native.spec.ts"))
 assert.ok(pattern.test("C:\\repo\\tests\\button\\native.spec.ts"))
 assert.ok(pattern.test("/repo/tests/button/native.spec.ts"))
 assert.equal(pattern.test("/repo/tests/input/native.spec.ts"),false)
 assert.equal(pattern.test("/repo/tests/not-button/native.spec.ts"),false)
 assert.throws(()=>browserFilePattern("../button/native.spec.ts"))
})

test("nested helper-defined checkpoints retain only both source-identical inputs",()=>fixture(async({root,record,candidate,output})=>{
 const file="button/native.spec.ts",owner="tests/"+file,definition="src/family.mjs"
 await mkdir(path.dirname(path.join(root,owner)),{recursive:true});await mkdir(path.join(root,"src"))
 await writeFile(path.join(root,owner),"wrapper source");await writeFile(path.join(root,definition),"helper source")
 const hash=value=>createHash("sha256").update(value).digest("hex")
 const sourceFiles=[{file:owner,sha256:hash("wrapper source")},{file:definition,sha256:hash("helper source")}]
 const declaration={id:record.id,title:["",file,"suite","case"],file:owner,definitionFile:definition,sourceSha256:sourceFiles[0].sha256,definitionSha256:sourceFiles[1].sha256,sourceFiles}
 const directory=path.join(root,"prior/checkpoints",file);await mkdir(directory,{recursive:true})
 await writeFile(path.join(directory,"expected.json"),JSON.stringify({schemaVersion:3,rootDir:path.join(root,"tests"),sourceRoot:root,repositoryRoot:root,tests:[declaration]}))
 await writeFile(path.join(directory,"results.jsonl"),JSON.stringify({...record,...declaration})+"\n")
 assert.equal((await reusableBrowserTests([candidate],file,root)).length,1)
 await writeFile(path.join(root,definition),"changed helper")
 assert.deepEqual(await reusableBrowserTests([candidate],file,root),[])
 await writeFile(path.join(root,definition),"helper source");await writeFile(path.join(root,owner),"changed wrapper")
 assert.deepEqual(await reusableBrowserTests([candidate],file,root),[])
}))


test("Playwright checkpoints bind a nested owning file separately from its declaring helper",()=>fixture(async({root,candidate})=>{
 await rm(path.join(root,"tests/sample.spec.ts"))
 const file="button/helper-owned.spec.ts",definition="src/declare.mjs",directory=path.join(root,"prior/checkpoints",file)
 await mkdir(path.join(root,"tests/button"),{recursive:true});await mkdir(path.join(root,"src"))
 await writeFile(path.join(root,"playwright.config.mjs"),'export default {testDir:"./tests",workers:1};')
 await writeFile(path.join(root,"tests",file),'import {declare} from "../../src/declare.mjs";declare();')
 await writeFile(path.join(root,definition),'import {test} from "@playwright/test";import {appendFileSync} from "node:fs";export function declare(){test("helper case",()=>appendFileSync("runs.txt","executed\\n"))}')
 const reporter=fileURLToPath(import.meta.resolve("@grasscn/tests/checkpoint-reporter"))
 const result=spawnSync(process.execPath,[packageBin("@playwright/test","playwright"),"test","--config=playwright.config.mjs","--reporter=list,"+reporter,"--output="+path.join(root,"prior/browser")],{cwd:root,encoding:"utf8",env:{...process.env,GRASSCN_CHECKPOINT_REPORT_DIR:directory}})
 assert.equal(result.status,0,result.stdout+result.stderr)
 const metadata=JSON.parse(await readFile(path.join(directory,"expected.json"),"utf8")),decl=metadata.tests[0]
 assert.equal(await readFile(path.join(root,"runs.txt"),"utf8"),"executed\n")
 assert.equal(metadata.schemaVersion,3)
 assert.equal(decl.file,"tests/"+file)
 assert.equal(decl.definitionFile,definition)
 assert.equal(decl.sourceFiles.length,2)
 assert.equal((await reusableBrowserTests([candidate],file,root)).length,1)
 await writeFile(path.join(root,definition),'changed helper source')
 assert.deepEqual(await reusableBrowserTests([candidate],file,root),[])
}))
