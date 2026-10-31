import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from "node:fs"
import path from "node:path"
import {createHash} from "node:crypto"

export default class CheckpointReporter {
 constructor(){this.directory=process.env.GRASSCN_CHECKPOINT_REPORT_DIR;this.sources=new Map();this.counts={passed:0,failed:0,timedOut:0,skipped:0,interrupted:0};this.changed=new Set()}
 onBegin(config,suite){
  if(!this.directory)return
  mkdirSync(this.directory,{recursive:true})
  const tests=suite.allTests().map(test=>{const file=test.location.file;if(!this.sources.has(file))this.sources.set(file,this.hash(file));return {id:test.id,title:test.titlePath(),file:path.relative(process.cwd(),file),line:test.location.line,sourceSha256:this.sources.get(file)}})
  writeFileSync(path.join(this.directory,"expected.json"),JSON.stringify({startedAt:new Date().toISOString(),workers:config.workers,tests},null,2)+"\n")
  writeFileSync(path.join(this.directory,"results.jsonl"),"")
 }
 hash(file){return createHash("sha256").update(readFileSync(file)).digest("hex")}
 onTestEnd(test,result){
  if(!this.directory)return
  const changed=this.hash(test.location.file)!==this.sources.get(test.location.file);if(changed)this.changed.add(test.location.file)
  this.counts[result.status]=(this.counts[result.status]??0)+1
  const attachment=result.attachments.find(item=>item.name==="grasscn-verification-artifacts")
  const verification=attachment?JSON.parse(attachment.body?.toString()??readFileSync(attachment.path,"utf8")):undefined
  appendFileSync(path.join(this.directory,"results.jsonl"),JSON.stringify({id:test.id,file:path.relative(process.cwd(),test.location.file),title:test.titlePath(),status:result.status,expectedStatus:test.expectedStatus,retry:result.retry,durationMs:result.duration,sourceChanged:changed,verification,errors:result.errors.map(error=>error.message?.slice(0,1000))})+"\n")
 }
 onEnd(result){if(this.directory)writeFileSync(path.join(this.directory,"summary.json"),JSON.stringify({status:result.status,finishedAt:new Date().toISOString(),counts:this.counts,changedSources:[...this.changed]},null,2)+"\n")}
}
