import {spawn, execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile, readdir, stat} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const [suite, output] = process.argv.slice(2)
if (!['regressions', 'pixels', 'all'].includes(suite) || !output) throw Error('Use the guarded package commands')
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
const environment = {node:process.version, platform:process.platform, arch:process.arch, webgl:process.env.GRASSCN_WEBGL_BACKEND??null, fixture:process.env.GRASSCN_FIXTURE_URL??null, preview:process.env.GRASSCN_PREVIEW_URL??null}
for(const executable of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']) {
  try { const info=await stat(executable); environment.edge={executable,size:info.size,modified:info.mtimeMs}; break } catch(error) { if(error.code!=='ENOENT')throw error }
}
const report = {suite, startedAt:new Date().toISOString(), source:before, environment, checks:[], passed:false,
  scope:'Local suite only. No fresh native launch or shadcn CLI installation; no merge performed.'}
const receipt = path.join(output,'verification.json')
const save = () => writeFile(receipt, JSON.stringify(report,null,2)+'\n')
const previous = []
for(const folder of await readdir(path.dirname(output))) {
  try {
    const filename=path.join(path.dirname(output),folder,'verification.json'), candidate=JSON.parse(await readFile(filename,'utf8'))
    if(candidate.source?.treeSha256===before.treeSha256 && candidate.source?.commit===before.commit && JSON.stringify(candidate.environment)===JSON.stringify(environment)) previous.push({filename,report:candidate})
  } catch(error) { if(error.code!=='ENOENT' && !(error instanceof SyntaxError))throw error }
}
await save()
const regressionFiles = ['advancement-gestures','player-custom-skin','trading-scroll','player-list-behavior','native-expansion-preview'].map(name=>name+'.spec.ts')
const steps = [
  ['prepare-preview', ['scripts/prepare-preview.mjs']],
  ['types', ['node_modules/typescript/bin/tsc','--noEmit']],
  ['evidence', ['scripts/check-map.mjs']],
  ['porting-evidence', ['scripts/check-porting-evidence.mjs']],
  ['evidence-negative-controls', ['--test','tests/porting-evidence.test.mjs']],
]
if (suite === 'all') steps.push(['registry-build',['node_modules/shadcn/dist/index.js','build']], ['preview-build',['node_modules/vite/bin/vite.js','build','--config','vite.preview.config.ts']])
const browserFiles=suite==='all'?(await readdir(path.join(root,'tests'))).filter(name=>/\.spec\.(ts|js)$/.test(name)).sort():suite==='pixels'?['adventure.spec.ts','native-expansion.spec.ts']:regressionFiles
for(const file of browserFiles) steps.push([`browser:${file}`, ['node_modules/@playwright/test/cli.js','test',file,'--workers=1',`--output=${path.join(output,'browser',file)}`]])
try {
  for (const [name,args] of steps) {
    // Only terminal successful steps are reusable; a killed child never records one.
    const retained=previous.find(candidate=>candidate.report.suite===suite && candidate.report.checks?.some(check=>check.name===name && check.exitCode===0))
    if(retained && name!=='prepare-preview') {
      report.checks.push({name,exitCode:0,reusedFrom:retained.filename}); await save()
      console.log(`Reused unchanged-source check: ${name}`); continue
    }
    console.log(`\nLocal verification: ${name}`)
    const code = await new Promise((resolve,reject)=>{
      const child = spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,GOMAXPROCS:'1',RAYON_NUM_THREADS:'1'}})
      child.on('error',reject); child.on('exit',(code,signal)=>resolve(code??(signal?1:0)))
    })
    report.checks.push({name,exitCode:code}); await save()
    if(code!==0) throw Error(`${name} failed (${code})`)
  }
  report.sourceAfter = await identity()
  if(report.sourceAfter.treeSha256 !== before.treeSha256 || report.sourceAfter.commit !== before.commit) throw Error('Source changed during verification; rerun against the final tree')
  report.passed = true
} catch(error) {
  report.error = error.message; process.exitCode = 1
} finally {
  report.finishedAt = new Date().toISOString(); await save()
  console.log(`Verification receipt: ${receipt}`)
}
