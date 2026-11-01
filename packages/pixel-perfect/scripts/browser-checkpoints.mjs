import {readFile} from "node:fs/promises"
import path from "node:path"
import {createHash} from "node:crypto"
import {resolveRepositoryPath} from '../../../workspace-paths.mjs'

const digest=bytes=>createHash("sha256").update(bytes).digest("hex")
export const browserFilePattern=file=>String.raw`(?:^|[\\/])${file.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}$`

/** The caller must already match the entire source tree and runtime environment. */
export async function reusableBrowserTests(candidates,file,root){
  const tests=new Map(),spec=resolveRepositoryPath(path.join("tests",file),root),source=digest(await readFile(spec))
  for(const candidate of [...candidates].sort((a,b)=>(a.report.startedAt??a.filename).localeCompare(b.report.startedAt??b.filename))){
    const run=path.dirname(candidate.filename),directory=path.join(run,"checkpoints",file)
    let expected,records
    try{
      expected=JSON.parse(await readFile(path.join(directory,"expected.json"),"utf8"))
      if(expected.schemaVersion!==2||!expected.rootDir||!Array.isArray(expected.tests)){tests.clear();continue}
      const raw=await readFile(path.join(directory,"results.jsonl"),"utf8"),lines=raw.split("\n")
      // A killed writer may leave its final line incomplete. Earlier malformed lines invalidate the journal.
      if(!raw.endsWith("\n"))lines.pop()
      records=lines.filter(Boolean).map(line=>JSON.parse(line))
    }catch(error){
      // No journal means this file was not reached. A corrupt newer journal
      // could conceal a failure, so it invalidates earlier passes for the file.
      if(error.code!=="ENOENT")tests.clear()
      continue
    }
    const declarations=new Map(expected.tests.map(test=>[test.id,test]))
    for(const record of records){
      const declaration=declarations.get(record.id)
      if(record.status!=="passed"||record.expectedStatus!=="passed"||record.retry!==0){tests.delete(record.id);continue}
      if(!declaration||declaration.sourceSha256!==source||record.status!=="passed"||record.expectedStatus!=="passed"||record.sourceChanged!==false)continue
      if(!Array.isArray(record.title)||record.title.length<3||typeof record.file!=="string")continue
      if(path.resolve(root,record.file)!==spec||record.title.some(title=>/[\r\n›]/.test(title)))continue
      let intact=true
      for(const artifact of record.verification?.artifacts??[]){
        const output=path.resolve(record.verification.outputDirectory)
        if(!output.startsWith(run+path.sep)||path.basename(artifact.file)!==artifact.file){intact=false;break}
        try{if(digest(await readFile(path.join(output,artifact.file)))!==artifact.pngSha256)intact=false}catch{intact=false}
      }
      if(!intact)continue
      const relative=path.relative(expected.rootDir,spec).replaceAll(path.sep,"/")
      if(relative.startsWith("../")||path.isAbsolute(relative))continue
      tests.set(record.id,{id:record.id,line:`[${record.title[0]}] › ${relative} › ${record.title.slice(2).join(" › ")}`,from:candidate.filename,verification:record.verification})
    }
  }
  return [...tests.values()]
}
