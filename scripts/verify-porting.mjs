import {spawn, execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile, readdir, stat} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {reusableBrowserTests,browserFilePattern} from './browser-checkpoints.mjs'
import {fixtureManifest,serveProductionFixture} from './production-fixture.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const [suite, output, workerArgument='1'] = process.argv.slice(2)
const workers=Number(workerArgument)
if(!Number.isInteger(workers)||workers<1||workers>8)throw Error('Use 1-8 browser workers')
if (!['regressions', 'pixels', 'all'].includes(suite) || !output) throw Error('Use the guarded package commands')
const managedFixture=suite==='all'&&!['GRASSCN_FIXTURE_URL','GRASSCN_EXPANSION_URL','GRASSCN_EXPANSION_REFERENCE','GRASSCN_TREE_INSTALLED_URL','GRASSCN_INSTALLED_BUNDLE_SHA256'].some(name=>process.env[name])
if(managedFixture){
  process.env.GRASSCN_FIXTURE_URL='http://127.0.0.1:5178'
  process.env.GRASSCN_EXPANSION_URL='http://127.0.0.1:5178/adventure.html'
  process.env.GRASSCN_TREE_INSTALLED_URL='http://127.0.0.1:5178/adventure.html'
}
await mkdir(output, {recursive:true})
const git = args => execFileSync('git', args, {cwd:root, encoding:'utf8', maxBuffer:16*1024*1024}).trim()
async function identity() {
  const names = [...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean))].sort()
  const hash = createHash('sha256')
  for (const name of names) {
    let bytes
    try { bytes = await readFile(path.join(root,name)) } catch (error) { if(error.code !== 'ENOENT') throw error; bytes = Buffer.from('<deleted>') }
    hash.update(name).update('\0').update(createHash('sha256').update(bytes).digest()).update('\0')
  }
  return {commit:git(['rev-parse','HEAD']), treeSha256:hash.digest('hex'), status:git(['status','--porcelain=v1'])}
}
const before = await identity()
const environment = {workers,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,locale:Intl.DateTimeFormat().resolvedOptions().locale,ci:process.env.CI??null,fixtureOverrides:Object.fromEntries(['GRASSCN_EXPANSION_URL','GRASSCN_EXPANSION_REFERENCE','GRASSCN_TREE_INSTALLED_URL','GRASSCN_INSTALLED_BUNDLE_SHA256'].map(key=>[key,process.env[key]??null])),node:process.version, platform:process.platform, arch:process.arch, webgl:process.env.GRASSCN_WEBGL_BACKEND??null, fixture:process.env.GRASSCN_FIXTURE_URL??null, preview:process.env.GRASSCN_PREVIEW_URL??null}
for(const executable of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']) {
  try { const info=await stat(executable); environment.edge={executable,size:info.size,modified:info.mtimeMs}; break } catch(error) { if(error.code!=='ENOENT')throw error }
}
async function installedDependencyState() {
  const file=path.join(root,'node_modules/.package-lock.json')
  try { const [bytes,info]=await Promise.all([readFile(file),stat(file)]);return {sha256:createHash('sha256').update(bytes).digest('hex'),modified:info.mtimeMs} }
  catch(error) { if(error.code!=='ENOENT')throw error;return null }
}
environment.installedDependencies=await installedDependencyState()
environment.fixtureMode=managedFixture?'production':'provided-or-development'
const report = {suite, startedAt:new Date().toISOString(), source:before, environment, checks:[], passed:false,
  scope:'Local suite only. No fresh native launch or shadcn CLI installation; no merge performed.'}
const receipt = path.join(output,'verification.json')
const save = () => writeFile(receipt, JSON.stringify(report,null,2)+'\n')
const cacheAllowed=environment.installedDependencies!==null&&(managedFixture||(!process.env.GRASSCN_EXPANSION_REFERENCE&&!process.env.GRASSCN_EXPANSION_URL&&!process.env.GRASSCN_TREE_INSTALLED_URL&&(!process.env.GRASSCN_FIXTURE_URL||/^http:\/\/127\.0\.0\.1:5174\/?$/.test(process.env.GRASSCN_FIXTURE_URL))))
const previous = []
for(const folder of await readdir(path.dirname(output))) {
  try {
    const filename=path.join(path.dirname(output),folder,'verification.json'), candidate=JSON.parse(await readFile(filename,'utf8'))
    if(cacheAllowed&&candidate.source?.treeSha256===before.treeSha256 && candidate.source?.commit===before.commit && JSON.stringify(candidate.environment)===JSON.stringify(environment)) previous.push({filename,report:candidate})
  } catch(error) { if(error.code!=='ENOENT' && !(error instanceof SyntaxError))throw error }
}
await save()
const regressionFiles = ['advancement-gestures','player-custom-skin','trading-scroll','player-list-behavior','native-expansion-preview'].map(name=>name+'.spec.ts')
const steps = [
  ['prepare-preview', ['scripts/prepare-preview.mjs']],
  ['types', ['node_modules/typescript/bin/tsc','--noEmit']],
  ['primitives', ['scripts/check-primitives.mjs']],
  ['registry-closure', ['scripts/check-registry-closure.mjs']],
  ['evidence', ['scripts/check-map.mjs']],
  ['porting-evidence', ['scripts/check-porting-evidence.mjs']],
  ['evidence-negative-controls', ['--test','tests/porting-evidence.test.mjs','tests/primitives.test.mjs','tests/browser-checkpoints.test.mjs','tests/guarded-entry.test.mjs','tests/installed-case-cache.test.mjs','tests/production-fixture.test.mjs']],
]
if (suite === 'all') steps.push(['registry-build',['node_modules/shadcn/dist/index.js','build']], ['built-primitives',['scripts/check-primitives.mjs','--built']], ['preview-build',['node_modules/vite/bin/vite.js','build','--config','vite.preview.config.ts']])
if(managedFixture)steps.push(['fixture-build',['scripts/production-fixture.mjs']])
const browserFiles=suite==='all'?(await readdir(path.join(root,'tests'))).filter(name=>/\.spec\.(ts|js)$/.test(name)).sort():suite==='pixels'?['adventure.spec.ts','native-expansion.spec.ts']:regressionFiles
for(const file of browserFiles) steps.push([`browser:${file}`, ['node_modules/@playwright/test/cli.js','test',browserFilePattern(file),`--workers=${workers}`,...(workers>1?['--fully-parallel']:[]),`--output=${path.join(output,'browser',file)}`]])
let fixtureHost,previewHost
try {
  for (const [name,args] of steps) {
    // Rebuild generated outputs and rerun prechecks. Browser passes are reused
    // individually below, with current test status and artifact hashes checked.
    console.log(`\nLocal verification: ${name}`)
    let browserEnvironment={}
    let reusedTests=[]
    if(name.startsWith('browser:')){
      if(managedFixture&&!fixtureHost){
        report.fixtureBundle=fixtureManifest()
        await writeFile(path.join(output,'fixture-bundle.json'),JSON.stringify(report.fixtureBundle,null,2)+'\n')
        fixtureHost=await serveProductionFixture()
        let previewReady=false
        try{const response=await fetch(process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/',{signal:AbortSignal.timeout(2500)});previewReady=response.ok;await response.body?.cancel()}catch{}
        if(!previewReady){
          if(process.env.GRASSCN_PREVIEW_URL)throw Error('The configured preview server is unavailable')
          const {createServer}=await import('vite')
          previewHost=await createServer({configFile:path.join(root,'vite.preview.config.ts')})
          await previewHost.listen()
        }
        await save()
      }
      const file=name.slice('browser:'.length),directory=path.join(output,'checkpoints',file)
      reusedTests=await reusableBrowserTests(previous.filter(candidate=>candidate.report.suite===suite&&(!managedFixture||candidate.report.fixtureBundle?.sha256===report.fixtureBundle.sha256)),file,root)
      await mkdir(directory,{recursive:true})
      if(reusedTests.length){const list=path.join(directory,'retained-tests.txt');await writeFile(list,reusedTests.map(test=>test.line).join('\n')+'\n');args.push('--test-list-invert',list,'--pass-with-no-tests');console.log(`Retaining ${reusedTests.length} successful tests from matching source/environment`)}
      args.push('--reporter=list,./scripts/checkpoint-reporter.mjs')
      browserEnvironment.GRASSCN_CHECKPOINT_REPORT_DIR=directory
    }
    const code = await new Promise((resolve,reject)=>{
      const child = spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,GOMAXPROCS:'1',RAYON_NUM_THREADS:'1',...browserEnvironment}})
      child.on('error',reject); child.on('exit',(code,signal)=>resolve(code??(signal?1:0)))
    })
    report.checks.push({name,exitCode:code,...(reusedTests.length?{reusedTests}: {})}); await save()
    if(code!==0) throw Error(`${name} failed (${code})`)
  }
  report.sourceAfter = await identity()
  if(report.sourceAfter.treeSha256 !== before.treeSha256 || report.sourceAfter.commit !== before.commit) throw Error('Source changed during verification; rerun against the final tree')
  report.dependenciesAfter=await installedDependencyState()
  if(JSON.stringify(report.dependenciesAfter)!==JSON.stringify(environment.installedDependencies))throw Error('Installed dependencies changed during verification; rerun against the final environment')
  if(managedFixture){
    report.fixtureBundleAfter=fixtureManifest()
    if(report.fixtureBundleAfter.sha256!==report.fixtureBundle.sha256)throw Error('The production fixture changed during verification')
  }
  report.passed = true
} catch(error) {
  report.error = error.message; process.exitCode = 1
} finally {
  await fixtureHost?.close()
  await previewHost?.close()
  report.finishedAt = new Date().toISOString(); await save()
  console.log(`Verification receipt: ${receipt}`)
}
