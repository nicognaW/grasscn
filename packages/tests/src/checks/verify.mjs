import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises'
import path from 'node:path'
import {repoRoot,testRoot,packageBin} from '@tests/paths'
import {serveVerificationHosts} from '@grasscn/tests/hosts'
import {fixtureManifest} from '@grasscn/tests/fixture'
import {installedDependencyIdentity} from '@grasscn/tests/dependency-identity'
import {sourceIdentity,stampProductionBuild,productionBuildIdentity} from '@grasscn/tests/next-production'

const [output,workerArgument='1']=process.argv.slice(2),workers=Number(workerArgument)
assert(output&&Number.isInteger(workers)&&workers>=1&&workers<=8,'Use the guarded normal verification command')
const phase=process.env.GRASSCN_VERIFY_PHASE??'all'
assert(['all','prepare','browser'].includes(phase),'Use prepare, browser or all verification phase')
await mkdir(output,{recursive:true})
const source=await sourceIdentity(),dependencies=installedDependencyIdentity(repoRoot)
assert(dependencies,'Normal verification requires this source workspace dependency installation')
const environment={scope:'normal',pptIncluded:false,workers,bun:Bun.version,platform:process.platform,arch:process.arch,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,locale:Intl.DateTimeFormat().resolvedOptions().locale,ci:process.env.CI??null,webgl:process.env.GRASSCN_WEBGL_BACKEND??null,installedDependencies:dependencies}
for(const executable of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']){
 try{const info=await stat(executable);environment.edge={executable,size:info.size,modified:info.mtimeMs};break}catch(error){if(error.code!=='ENOENT')throw error}
}
const report={scope:'normal',pptIncluded:false,source,environment,phase,startedAt:new Date().toISOString(),checks:[],completed:false,passed:false}
const save=()=>writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n')
const steps=[
 ['generate',[packageBin('turbo','turbo',repoRoot),'run','generate'],repoRoot],
 ['types',[packageBin('uncheck','uncheck',repoRoot),'--only=tsc','--require=tsc','--cwd',repoRoot],repoRoot],
 ['primitives',[path.join(testRoot,'src/checks/check-primitives.mjs')],testRoot],
 ['registry-closure',[path.join(testRoot,'src/checks/check-registry-closure.mjs')],testRoot],
 ['production-build',[packageBin('turbo','turbo',repoRoot),'run','build'],repoRoot],
 ['built-primitives',[path.join(testRoot,'src/checks/check-primitives.mjs'),'--built'],testRoot],
 ['fixture-build',[path.join(testRoot,'cli/build-fixture.mjs')],testRoot],
 ['normal-unit-contracts',['run','test:unit'],testRoot],
]
if(phase==='browser'){
 const prepared=JSON.parse(await readFile(path.join(output,'prepared.json'),'utf8'))
 assert.deepEqual(prepared.source,source,'Prepared normal source changed')
 assert.deepEqual(prepared.environment,environment,'Prepared normal environment/dependencies changed')
 assert.equal((await productionBuildIdentity({source})).outputSha256,prepared.websiteBuild.outputSha256,'Prepared Next bytes changed')
 assert.equal(fixtureManifest().sha256,prepared.fixtureBundle.sha256,'Prepared independent fixture bytes changed')
 report.websiteBuild=prepared.websiteBuild;report.fixtureBundle=prepared.fixtureBundle
 steps.length=0
}
if(phase!=='prepare')steps.push(['normal-browser',[packageBin('@playwright/test','playwright',testRoot),'test','--config',path.join(testRoot,'playwright.config.ts'),`--workers=${workers}`,`--output=${path.join(output,'browser')}`,`--reporter=list,json,${path.join(testRoot,'src/runtime/checkpoint-reporter.mjs')}`],testRoot])
let hosts
try{
 for(const[name,args,cwd]of steps){
  let browserEnvironment={}
  if(name==='normal-browser'){
   await writeFile(path.join(output,'verification-phase.json'),JSON.stringify({phase:'browser',source}))
   hosts=await serveVerificationHosts({fixturePort:5284,previewPort:5286,proxyPort:5287})
   const {buildId,outputSha256,source:websiteSource,bun,runtime}=hosts.websiteIdentity
   report.websiteBuild={buildId,outputSha256,source:websiteSource,bun,runtime}
   browserEnvironment={GRASSCN_BROWSER_SCOPE:'ordinary',GRASSCN_FIXTURE_URL:'http://127.0.0.1:5174',GRASSCN_PREVIEW_URL:'http://127.0.0.1:5176/',GRASSCN_EXPANSION_URL:'http://127.0.0.1:5174/adventure.html',GRASSCN_TREE_INSTALLED_URL:'http://127.0.0.1:5174/adventure.html',GRASSCN_BROWSER_PROXY_PORT:'5287',GRASSCN_WEBSITE_IDENTITY:JSON.stringify(report.websiteBuild),GRASSCN_CHECKPOINT_REPORT_DIR:path.join(output,'checkpoints'),PLAYWRIGHT_JSON_OUTPUT_NAME:path.join(output,'playwright.json')}
  }
  console.log(`Normal verification: ${name}`)
  const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd,env:{...process.env,GOMEMLIMIT:process.env.GOMEMLIMIT??'768MiB',GOMAXPROCS:'1',RAYON_NUM_THREADS:'1',GRASSCN_BROWSER_SCOPE:'ordinary',...browserEnvironment},stdio:'inherit'});child.once('error',reject);child.once('exit',(code,signal)=>resolve(code??(signal?1:0)))})
  report.checks.push({name,exitCode:code});await save()
  assert.equal(code,0,`${name} failed`)
  if(name==='production-build')report.websiteBuild=await stampProductionBuild({source})
  if(name==='fixture-build')report.fixtureBundle=fixtureManifest()
 }
 report.sourceAfter=await sourceIdentity()
 assert.deepEqual(report.sourceAfter,source,'Normal verification source changed')
 report.dependenciesAfter=installedDependencyIdentity(repoRoot)
 assert.deepEqual(report.dependenciesAfter,dependencies,'Normal verification installed bytes changed')
 assert.equal(fixtureManifest().sha256,report.fixtureBundle.sha256,'Independent fixture changed during normal verification')
 assert.equal((await productionBuildIdentity({source})).outputSha256,report.websiteBuild.outputSha256,'Next output changed during normal verification')
 if(phase==='prepare'){
  report.prepared=true
  await writeFile(path.join(output,'prepared.json'),JSON.stringify({source,environment,websiteBuild:report.websiteBuild,fixtureBundle:report.fixtureBundle},null,2)+'\n')
 }else{report.completed=true;report.passed=true}
}catch(error){report.error=String(error.stack??error);process.exitCode=1}
finally{await hosts?.close();report.finishedAt=new Date().toISOString();await save();console.log(`Normal verification receipt: ${path.join(output,'verification.json')}`)}
