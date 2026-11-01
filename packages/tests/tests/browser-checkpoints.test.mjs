import {packageBin} from '../../../workspace-paths.mjs'
import {test} from "bun:test"
import assert from "node:assert/strict"
import {mkdtemp,mkdir,readFile,writeFile,rm} from "node:fs/promises"
import {createHash} from "node:crypto"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {spawnSync} from "node:child_process"
import {browserFilePattern,reusableBrowserTests} from "../scripts/browser-checkpoints.mjs"

test("browser file filters select exact basenames on Windows and POSIX",()=>{
  const pattern=new RegExp(browserFilePattern("select.spec.ts"))
  assert.ok(pattern.test("C:\\repo\\tests\\select.spec.ts"))
  assert.ok(pattern.test("/repo/tests/select.spec.ts"))
  assert.equal(pattern.test("/repo/tests/native-select.spec.ts"),false)
  assert.equal(pattern.test("/repo/tests/selectXspec.ts"),false)
})

async function fixture(run){
  const parent=path.resolve("test-results");await mkdir(parent,{recursive:true})
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
  const repo=fileURLToPath(new URL("..",import.meta.url))
  await writeFile(path.join(root,"playwright.config.mjs"),'export default {testDir:"./tests",workers:1};')
  await writeFile(path.join(root,"tests",file),'import {test,expect} from "@playwright/test";import {appendFileSync} from "node:fs";for(const name of ["first","second"])test(name,()=>{appendFileSync("runs.txt",name+"\\n");expect(name.length).toBeGreaterThan(0)});')
  const run=(args,env={})=>{
    const result=spawnSync(process.execPath,[packageBin("@playwright/test", "playwright"),"test","--config=playwright.config.mjs",...args],{cwd:root,encoding:"utf8",env:{...process.env,...env}})
    assert.equal(result.status,0,result.stdout+result.stderr)
  }
  run(["--reporter=list,"+path.join(repo,"scripts/checkpoint-reporter.mjs"),"--output="+path.join(root,"prior/browser")],{GRASSCN_CHECKPOINT_REPORT_DIR:path.join(root,"prior/checkpoints",file)})
  const retained=await reusableBrowserTests([candidate],file,root)
  assert.equal(retained.length,2)
  const list=path.join(root,"retained.txt")
  await writeFile(list,retained.map(record=>record.line).join("\n")+"\n")
  run(["--test-list-invert",list,"--pass-with-no-tests","--output="+path.join(root,"second/browser")])
  assert.deepEqual((await readFile(path.join(root,"runs.txt"),"utf8")).trim().split("\n"),["first","second"])
}))
