import {repoRoot, packageBin} from '../../../workspace-paths.mjs'
import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

export const browserRoot = fileURLToPath(new URL('..', import.meta.url))
const cli = packageBin('@playwright/test', 'playwright')
const catalogueFile = path.join(browserRoot, 'scripts/browser-base-cases.json')
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const caseKey = test => JSON.stringify([test.file, test.titlePath])

export function baseCatalogue() {
  const data = JSON.parse(fs.readFileSync(catalogueFile, 'utf8'))
  if (data.schemaVersion !== 1 || !Array.isArray(data.cases) || !data.cases.length) throw Error('Invalid or empty Base catalogue')
  const keys = new Set()
  for (const test of data.cases) {
    if (path.basename(test.file ?? '') !== test.file || !/\.spec\.(ts|js)$/.test(test.file) || !test.title || !Array.isArray(test.titlePath) || !test.titlePath.length || test.titlePath.some(title => typeof title !== 'string' || /[\r\n]/.test(title)) || test.titlePath.at(-1) !== test.title) throw Error('Invalid Base case identity')
    const key = caseKey(test)
    if (keys.has(key)) throw Error(`Duplicate Base case: ${test.file}: ${test.title}`)
    keys.add(key)
    const evidence = test.evidence
    if (!evidence?.reason || !test.components?.length || !['website-default', 'shadcn-test'].includes(evidence.kind)) throw Error(`Missing Base evidence: ${test.title}`)
    if (evidence.kind === 'website-default' && !evidence.route?.startsWith('/')) throw Error(`Missing website route: ${test.title}`)
    if (evidence.kind === 'shadcn-test' && (!/^https:\/\/github\.com\/shadcn-ui\/ui\/blob\/[a-f0-9]{40}\//.test(evidence.url ?? '') || !evidence.upstreamTest)) throw Error(`Missing actual shadcn-test mapping: ${test.title}`)
  }
  return data.cases
}

export function baseGrep() {
  // Playwright's grep subject is project, file, describe titles and test title,
  // separated by spaces. The catalogue selects leaf cases, never whole files.
  return new RegExp(baseCatalogue().map(test => `(?:^| )${escape(test.file)} ${escape(test.titlePath.join(' '))}$`).join('|'))
}

export function flattenBrowserReport(report) {
  const cases = []
  function visit(suite, file, titles) {
    const isFile = Boolean(suite.file) && !file
    const currentFile = isFile ? suite.file.replaceAll('\\', '/').split('/').at(-1) : file
    const currentTitles = isFile ? [] : [...titles, ...(suite.title ? [suite.title] : [])]
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      cases.push({file: currentFile, titlePath: [...currentTitles, spec.title], projectName: test.projectName ?? '', id: test.testId ?? spec.id})
    }
    for (const child of suite.suites ?? []) visit(child, currentFile, currentTitles)
  }
  for (const suite of report.suites ?? []) visit(suite, undefined, [])
  return cases
}

function withoutReporter(args) {
  const result = []
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--reporter') { index++; continue }
    if (args[index].startsWith('--reporter=')) continue
    if (args[index] === '--list') continue
    if (/^--(ui|debug)(=|$)/.test(args[index])) throw Error('Interactive execution is not supported by the browser selection guard')
    result.push(args[index])
  }
  return result
}

export function collectBrowserCases(args = [], {effectiveSelection = false} = {}) {
  const result = spawnSync(process.execPath, [cli, 'test', ...withoutReporter(args), '--list', '--reporter=json'], {
    cwd: browserRoot, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    env: {...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: '', PLAYWRIGHT_JSON_OUTPUT_DIR: '', PLAYWRIGHT_JSON_OUTPUT_FILE: '', GOMAXPROCS: '1', RAYON_NUM_THREADS: '1', GRASSCN_BROWSER_GUARD_COLLECTION: effectiveSelection ? '1' : ''},
  })
  if (result.error) throw result.error
  let report
  try { report = JSON.parse(result.stdout) } catch { throw Error(`Browser collection failed: ${result.stderr || result.stdout}`) }
  if (result.status !== 0 || report.errors?.length) throw Error(`Browser collection failed: ${report.errors?.map(error => error.message).join('\n') || result.stderr}`)
  return flattenBrowserReport(report)
}

export function classifyBrowserCases(cases) {
  const catalogue = baseCatalogue()
  const selected = new Map()
  for (const entry of catalogue) {
    const matches = cases.filter(test => caseKey(test) === caseKey(entry))
    if (matches.length !== 1) throw Error(`Base mapping must identify exactly one case (${matches.length} found): ${entry.file}: ${entry.title}`)
    selected.set(caseKey(matches[0]), entry)
  }
  return {base: cases.filter(test => selected.has(caseKey(test))), full: cases.filter(test => !selected.has(caseKey(test))), evidence: selected}
}

export function assertBaseExecution(cases) {
  const allowed = new Set(baseCatalogue().map(caseKey))
  const full = cases.filter(test => !allowed.has(caseKey(test)))
  if (full.length) throw Error(`Full tests are not authorized by an ordinary browser command (${full.length} selected). Use an approved Full run issue and its independent execution session.`)
}

export async function main(args = process.argv.slice(2)) {
  const command = args.shift() ?? 'run'
  if (command === 'list') {
    const mode = args.find(arg => ['--base', '--full', '--all'].includes(arg)) ?? '--base'
    const pool = collectBrowserCases()
    const partition = classifyBrowserCases(pool)
    const cases = mode === '--all' ? pool : mode === '--full' ? partition.full : partition.base
    const summary = {base: partition.base.length, full: partition.full.length, total: pool.length, cases}
    console.log(args.includes('--json') ? JSON.stringify(summary, null, 2) : `${partition.base.length} Base + ${partition.full.length} Full = ${pool.length} existing browser cases\n${cases.map(test => `${test.file} › ${test.titlePath.join(' › ')}`).join('\n')}`)
    return
  }
  if (command !== 'run') throw Error('Use browser-suite.mjs run [Playwright filters] or list [--base|--full|--all] [--json]')
  if (process.env.GRASSCN_BROWSER_SCOPE === 'full') throw Error('Ordinary Base commands cannot become Full commands; use the approved Full executor')
  if (args.some(arg => /^--test-list(?:=|$)/.test(arg))) throw Error('The Base runner owns --test-list; use file or --grep filters within Base tests')
  const {foregroundLease} = await import('./full-run.mjs')
  const releaseForeground = foregroundLease()
  let selection
  try {
    const {base} = classifyBrowserCases(collectBrowserCases())
    const directory = path.join(repoRoot, '.pixel-perfect-test/browser-selection')
    fs.mkdirSync(directory, {recursive: true})
    selection = path.join(directory, `base-${process.pid}.txt`)
    fs.writeFileSync(selection, base.map(test => `[${test.projectName}] › ${test.file} › ${test.titlePath.join(' › ')}`).join('\n') + '\n')
    const result = spawnSync(process.execPath, [cli, 'test', ...args, '--test-list', selection], {cwd: browserRoot, stdio: 'inherit', env: process.env})
    if (result.error) throw result.error
    process.exitCode = result.status ?? 1
  } finally { if (selection) fs.rmSync(selection, {force: true}); releaseForeground() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
