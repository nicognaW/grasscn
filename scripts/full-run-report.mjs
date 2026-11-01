import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {fullRoot, fullRunPaths, readRunPlan, readRunState, readRunAttempts} from './full-run.mjs'
import {caseKey} from './browser-suite.mjs'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const json = value => JSON.stringify(value, null, 2) + '\n'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
const api = args => JSON.parse(execFileSync('gh', ['api', ...args], {cwd: fullRoot, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024}))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function atomic(file, value) {
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, json(value)); fs.renameSync(temp, file)
}
function beneath(root, file) {
  const resolved = fs.realpathSync(file), parent = fs.realpathSync(root)
  if (!resolved.startsWith(parent + path.sep)) throw Error(`Evidence escapes retained attempt: ${file}`)
  return resolved
}
function evidence(root, file) {
  file = beneath(root, file)
  return {localPath: file, sha256: hash(fs.readFileSync(file))}
}

/** Read historical evidence only. Never calls authorizeFullRun or launches a browser. */
export function completedRunReport(number) {
  const run = readRunPlan(number), state = readRunState(number)
  if (run.plan.repository.toLowerCase() !== run.repo.toLowerCase()) throw Error('Run repository mismatch')
  if (state?.phase !== 'completed' || !['passed', 'failed'].includes(state.outcome)) throw Error('Full collection is incomplete; defer finding publication and repairs')
  if (state.issue !== run.number || state.repository !== run.repo || state.commit !== run.plan.commit || state.planHash !== run.planHash || !same(state.environment, run.plan.environment) || !state.executionThread || !state.approval?.eventId) throw Error('Completed state does not bind this plan, snapshot, environment and executor')
  const attempts = readRunAttempts(number).sort((a, b) => a.directory.localeCompare(b.directory))
  const final = attempts.find(attempt => path.resolve(attempt.directory) === path.resolve(state.attempt ?? ''))
  if (!final || final !== attempts.at(-1) || state.receipt !== path.join(final.directory, 'verification.json')) throw Error('Final attempt/receipt binding is missing or newer evidence exists')
  const last = final.receipt
  if (last?.completed !== true || last.browserScope !== 'full' || last.suite !== 'full' || last.passed !== (state.outcome === 'passed') || !Array.isArray(last.fullCases) || !last.fullCases.length) throw Error('No complete Full receipt with exact scope; finishedAt alone is insufficient')
  const scope = new Map(last.fullCases.map(test => [caseKey(test), test]))
  if (scope.size !== last.fullCases.length) throw Error('Duplicate Full scope identities')
  const records = new Map(), history = new Map(), sourceHashes = new Map(), files = new Set(last.fullCases.map(test => test.file)), retainedEvidence = []
  let environment
  for (const attempt of attempts) {
    beneath(run.paths.attempts, attempt.directory)
    const resourceFile = path.join(attempt.directory, 'resource-summary.json')
    if (fs.existsSync(resourceFile)) retainedEvidence.push(evidence(attempt.directory, resourceFile))
    const receipt = attempt.receipt
    if (!receipt) {
      if (attempt === final || fs.existsSync(path.join(attempt.directory, 'checkpoints'))) throw Error(`Missing attempt receipt with collection evidence: ${attempt.directory}`)
      continue // A guard can stop before verification starts. This attempt contributes no results.
    }
    const binding = receipt.environment?.fullRun
    if (receipt.source?.commit !== run.plan.commit || receipt.browserScope !== 'full' || binding?.issue !== run.number || binding?.planHash !== run.planHash || binding?.approvalEvent !== state.approval.eventId) throw Error('Attempt belongs to different source, scope or authorization')
    for (const field of ['node', 'platform', 'arch', 'timezone', 'locale', 'ci', 'webgl', 'edge']) if (!same(receipt.environment[field], run.plan.environment[field])) throw Error(`Receipt environment differs from approved ${field}`)
    if (receipt.environment.workers !== run.plan.execution.workers || receipt.environment.installedDependencies?.sha256 !== run.plan.environment.installedDependenciesSha256) throw Error('Receipt workers/dependencies differ from approved environment')
    if (environment && (!same(environment, receipt.environment) || receipt.source.treeSha256 !== last.source.treeSha256)) throw Error('Attempt environment/tree changed across resumes')
    environment = receipt.environment
    if (receipt.sourceAfter && !same(receipt.sourceAfter, receipt.source)) throw Error('Source changed during collection')
    if (receipt.completed && (!same(receipt.dependenciesAfter, receipt.environment.installedDependencies) || receipt.fixtureBundleAfter?.sha256 !== receipt.fixtureBundle?.sha256)) throw Error('Completed receipt changed dependencies or fixture')
    retainedEvidence.push(evidence(attempt.directory, path.join(attempt.directory, 'verification.json')))
    for (const file of files) {
      if (path.basename(file) !== file) throw Error('Browser file is outside Full scope')
      const directory = path.join(attempt.directory, 'checkpoints', file)
      if (!fs.existsSync(directory)) continue
      const check = receipt.checks?.find(item => item.name === `browser:${file}`)
      const expectedFile = beneath(attempt.directory, path.join(directory, 'expected.json'))
      const expected = read(expectedFile)
      if (expected.schemaVersion !== 2 || !Array.isArray(expected.tests)) throw Error('Invalid checkpoint declarations')
      retainedEvidence.push(evidence(attempt.directory, expectedFile))
      const journalFile = beneath(attempt.directory, path.join(directory, 'results.jsonl'))
      retainedEvidence.push(evidence(attempt.directory, journalFile))
      const raw = fs.readFileSync(journalFile, 'utf8'), lines = raw.split('\n')
      if (!raw.endsWith('\n')) lines.pop()
      const journal = lines.filter(Boolean).map(line => JSON.parse(line))
      const declarations = new Map(expected.tests.map(test => [test.id, test]))
      if (!sourceHashes.has(file)) {
        const bytes = execFileSync('git', ['show', `${run.plan.commit}:tests/${file}`], {cwd: fullRoot, maxBuffer: 16 * 1024 * 1024})
        // Windows core.autocrlf checks out committed text with CRLF; both byte
        // representations identify the same committed source, not changed logic.
        sourceHashes.set(file, new Set([hash(bytes), hash(bytes.toString('utf8').replace(/\r?\n/g, '\r\n'))]))
      }
      for (const declaration of expected.tests) {
        const key = caseKey({file, titlePath: declaration.title?.slice(2)})
        if (!scope.has(key) || path.basename(declaration.file) !== file || !sourceHashes.get(file).has(declaration.sourceSha256)) throw Error('Declaration source or case identity differs from approved scope')
      }
      const terminal = new Set(), accounted = new Set()
      for (const record of journal) {
        const declaration = declarations.get(record.id)
        if (!declaration || !same(record.title, declaration.title) || record.file !== declaration.file || record.sourceChanged !== false || !Number.isInteger(record.retry)) throw Error('Journal identity or source changed')
        if (!['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(record.status) || !['passed', 'failed', 'skipped'].includes(record.expectedStatus)) throw Error('Invalid recorded result status')
        const key = caseKey({file, titlePath: declaration.title.slice(2)})
        accounted.add(key)
        const artifacts = (record.verification?.artifacts ?? []).map(artifact => {
          if (path.basename(artifact.file) !== artifact.file) throw Error('Invalid artifact filename')
          const result = evidence(attempt.directory, path.join(record.verification.outputDirectory, artifact.file))
          if (result.sha256 !== artifact.pngSha256) throw Error('Artifact hash changed')
          return result
        })
        const result = {key, file, titlePath: declaration.title.slice(2), status: record.status, expectedStatus: record.expectedStatus, retry: record.retry, errors: record.errors, artifacts, verification: record.verification, journal: journalFile, attempt: attempt.directory}
        const previous = records.get(key)
        if (previous?.attempt === attempt.directory && record.retry < previous.retry) throw Error('Retry journal regressed')
        records.set(key, result)
        history.set(key, [...(history.get(key) ?? []), {status: record.status, expectedStatus: record.expectedStatus, retry: record.retry, attempt: attempt.directory}])
        if (record.status !== 'interrupted') terminal.add(record.id)
      }
      if (receipt.completed) {
        const summaryFile = beneath(attempt.directory, path.join(directory, 'summary.json')), summary = read(summaryFile)
        const browserFile = beneath(attempt.directory, path.join(directory, 'playwright.json')), browser = read(browserFile)
        retainedEvidence.push(evidence(attempt.directory, summaryFile), evidence(attempt.directory, browserFile))
        if (!['passed', 'failed'].includes(summary.status) || summary.changedSources?.length || summary.counts?.interrupted || browser.errors?.length || raw && !raw.endsWith('\n') || expected.tests.some(test => !terminal.has(test.id))) throw Error('Completed receipt has incomplete/corrupt browser collection')
      }
      for (const reused of check?.reusedTests ?? []) {
        // Retained identities are checked below through the prior attempt declarations, not titles in a command string.
        const from = attempts.find(item => path.join(item.directory, 'verification.json') === reused.from)
        if (!from) throw Error('Retained pass has no source-bound attempt')
        const old = read(beneath(from.directory, path.join(from.directory, 'checkpoints', file, 'expected.json'))).tests.find(test => test.id === reused.id)
        const key = old && caseKey({file, titlePath: old.title.slice(2)}), retained = records.get(key)
        if (!retained || retained.status !== 'passed' || retained.expectedStatus !== 'passed' || retained.retry !== 0 || retained.attempt !== from.directory) throw Error('Retained pass was superseded or lacks valid provenance')
        accounted.add(key)
      }
      if (attempt === final && [...scope].some(([key, test]) => test.file === file && !accounted.has(key))) throw Error('Final file omitted cases without retained-pass provenance')
    }
  }
  for (const file of files) if (!last.checks?.some(check => check.name === `browser:${file}`)) throw Error('Final receipt did not finish every Full file')
  if (last.checks.some(check => !check.name.startsWith('browser:') && check.exitCode !== 0)) throw Error('Precheck failed before Full completion')
  const cases = [...scope.keys()].map(key => {
    const result = records.get(key)
    if (!result || result.status === 'interrupted') throw Error(`Uncollected Full case: ${key}`)
    return {...result, history: history.get(key), unexpected: result.status !== result.expectedStatus, flaky: result.status === result.expectedStatus && history.get(key).some(item => item.status !== item.expectedStatus)}
  })
  if (cases.some(test => test.unexpected) === last.passed) throw Error('Receipt outcome disagrees with final case results')
  const report = {schemaVersion: 1, runIssue: run.number, repository: run.repo, issueUrl: run.issue.html_url, testedCommit: run.plan.commit, planHash: run.planHash, scope: 'full', environment: run.plan.environment, executionThread: state.executionThread, executionSession: state.executionSession, approval: state.approval, outcome: state.outcome, total: cases.length, failures: cases.filter(test => test.unexpected), flaky: cases.filter(test => test.flaky), skipped: cases.filter(test => test.status === 'skipped').map(test => test.key), evidence: retainedEvidence}
  report.evidenceHash = hash(json(report))
  return {run, report}
}

export function prepareReport(number) {
  const {run, report} = completedRunReport(number)
  const directory = path.join(run.paths.directory, 'reporting'); fs.mkdirSync(directory, {recursive: true})
  const file = path.join(directory, `report-${report.evidenceHash}.json`)
  atomic(file, report)
  const review = {schemaVersion: 1, runIssue: run.number, planHash: run.planHash, testedCommit: run.plan.commit, evidenceHash: report.evidenceHash, reviewedBy: '', groups: [], instructions: 'Inspect evidence and existing issues. Account for every failure exactly once. Each semantic problemKey needs a cause hypothesis and evidence; shared error text alone is not a root cause. Optional existingIssue requires reuseReason. No repairs until collection completes.'}
  const reviewFile = path.join(directory, `review-${report.evidenceHash}.json`)
  if (!fs.existsSync(reviewFile)) atomic(reviewFile, review)
  return {report: file, review: reviewFile, failures: report.failures.length, flaky: report.flaky.length, publishing: false}
}

function evidenceLocation(report) {
  return path.join(readRunPlanPaths(report.runIssue), `report-${report.evidenceHash}.json`)
}

function readRunPlanPaths(number) {
  // No GitHub read or authorization needed to locate durable local reporting artifacts.
  return path.join(fullRunPaths(number).directory, 'reporting')
}

export function validateReview(report, review) {
  if (review.schemaVersion !== 1 || review.runIssue !== report.runIssue || review.planHash !== report.planHash || review.testedCommit !== report.testedCommit || review.evidenceHash !== report.evidenceHash || !review.reviewedBy?.trim() || !Array.isArray(review.groups)) throw Error('Review must bind the completed evidence and name its reviewer')
  const remaining = new Set(report.failures.map(test => test.key)), keys = new Set()
  for (const group of review.groups) {
    if (!/^[a-z0-9][a-z0-9.-]{2,100}$/.test(group.problemKey ?? '') || keys.has(group.problemKey) || !group.title?.trim() || !group.hypothesis?.trim() || !group.evidence?.trim() || !group.context?.trim() || !group.cases?.length) throw Error('Each distinct problem needs a unique semantic key, title, hypothesis, evidence, context and member cases')
    keys.add(group.problemKey)
    if (group.existingIssue !== undefined && (!Number.isInteger(group.existingIssue) || group.existingIssue < 1 || !group.reuseReason?.trim())) throw Error('Existing issue reuse requires an issue number and semantic reason')
    for (const key of group.cases) if (!remaining.delete(key)) throw Error('Failure omitted, duplicated or outside this completed run')
  }
  if (remaining.size) throw Error(`${remaining.size} failures remain ungrouped; inspect them before publication`)
}

function findingBody(report, group) {
  const failures = report.failures.filter(test => group.cases.includes(test.key))
  return `Full finding from ${report.issueUrl}\n\nTested local commit: ${report.testedCommit}\nPlan: ${report.planHash}\nEvidence identity: ${report.evidenceHash}\nExecution session: ${report.executionSession ?? report.executionThread}\nEnvironment: ${JSON.stringify(report.environment)}\n\nCause hypothesis: ${group.hypothesis}\n\nReviewed evidence: ${group.evidence}\n\nRepair context: ${group.context}\n\n${failures.length} affected cases; first 10:\n${failures.slice(0, 10).map(test => `- ${test.key}: expected ${test.expectedStatus}, observed ${test.status}; retry ${test.retry}. Errors: ${JSON.stringify(test.errors)?.slice(0, 1000)}\n  Local journal: ${test.journal}\n${test.artifacts.slice(0, 3).map(artifact => `  Local artifact: ${artifact.localPath} (sha256 ${artifact.sha256})`).join('\n')}`).join('\n')}\n\nComplete case/error/retry history and hashed evidence manifest (local, not uploaded): ${evidenceLocation(report)}\nReviewed membership/context: ${path.join(readRunPlanPaths(report.runIssue), `finding-${hash(group.problemKey)}.json`)}\n\nThe Full collection is complete. This finding enters the normal queue and does not block merging. Any suitable existing session, including the main session when its context fits, may repair it. Use a new repair session with this handoff when appropriate; do not create one per case. Reporting, assignment and reproduction commands grant no Full execution authorization. Changed-source Full validation requires a new run issue, human maintainer label approval and an independent executor. Base results and this historical Full snapshot establish only their own coverage.\n`
}

export function publishReport(number, reviewFile) {
  const {run, report} = completedRunReport(number), review = read(reviewFile)
  validateReview(report, review)
  const directory = path.join(run.paths.directory, 'reporting'); fs.mkdirSync(directory, {recursive: true})
  const lock = path.join(directory, 'publication.lock')
  try { fs.writeFileSync(lock, json({pid: process.pid, startedAt: new Date().toISOString()}), {flag: 'wx'}) }
  catch (error) { if (error.code === 'EEXIST') throw Error(`Another publisher or stale publication claim exists: ${lock}; inspect before removing it`); throw error }
  const journalFile = path.join(directory, 'publication.json'), journal = fs.existsSync(journalFile) ? read(journalFile) : {groups: {}}
  function writeApi(endpoint, body, method = 'POST') {
    const file = path.join(directory, `request-${process.pid}.json`); fs.writeFileSync(file, json(body))
    try { return api(['--method', method, endpoint, '--input', file]) } finally { fs.rmSync(file, {force: true}) }
  }
  try {
    // Paginate bodies rather than relying on eventually indexed search. After an ambiguous
    // API error, stop; a later invocation scans operation markers before retrying writes.
    const issues = api(['--paginate', '--slurp', `repos/${run.repo}/issues?state=all&per_page=100`]).flat().filter(issue => !issue.pull_request)
    const repositoryComments = review.groups.length ? api(['--paginate', '--slurp', `repos/${run.repo}/issues/comments?per_page=100`]).flat() : []
    atomic(evidenceLocation(report), report)
    const links = []
    for (const group of review.groups) {
      const identity = hash(`${run.repo.toLowerCase()}\n${group.problemKey}`), marker = `<!-- grasscn-full-problem:v1:${identity} -->`
      const occurrence = `<!-- grasscn-full-occurrence:v1:${run.number}:${run.planHash}:${identity} -->`
      const matches = issues.filter(issue => issue.body?.includes(marker) || repositoryComments.some(comment => comment.issue_url === issue.url && comment.body?.includes(marker)))
      if (matches.length > 1) throw Error('Multiple issues already claim this semantic problem; resolve duplicates before publishing')
      let issue = matches[0]
      if (group.existingIssue) {
        const chosen = issues.find(item => item.number === group.existingIssue)
        if (!chosen || chosen.number === run.number || issue && issue.number !== chosen.number) throw Error('Reviewed existing issue is invalid or conflicts with problem identity')
        issue = chosen
      }
      if (!issue) {
        issue = writeApi(`repos/${run.repo}/issues`, {title: group.title, body: `${marker}\n\n${findingBody(report, group)}`, labels: ['needs-triage']})
        issues.push(issue)
      }
      atomic(path.join(directory, `finding-${hash(group.problemKey)}.json`), {report: evidenceLocation(report), reportSha256: hash(json(report)), reviewedBy: review.reviewedBy, group})
      journal.groups[group.problemKey] = {issue: issue.number, url: issue.html_url, evidenceHash: report.evidenceHash, groupHash: hash(json(group))}; atomic(journalFile, journal)
      const comments = api(['--paginate', '--slurp', `repos/${run.repo}/issues/${issue.number}/comments`]).flat()
      if (!comments.some(comment => comment.body?.includes(occurrence))) {
        const comment = writeApi(`repos/${run.repo}/issues/${issue.number}/comments`, {body: `${marker}\n${occurrence}\n\n${group.reuseReason ? `Reuse rationale: ${group.reuseReason}\n\n` : ''}${findingBody(report, group)}`})
        journal.groups[group.problemKey].comment = comment.id; atomic(journalFile, journal)
      }
      links.push({problem: group.problemKey, issue: issue.html_url, state: issue.state})
    }
    const marker = `<!-- grasscn-full-report:v1:${run.number}:${run.planHash} -->`
    const body = `${marker}\n\nFull collection completed: **${report.outcome}** against local commit ${report.testedCommit}. Scope: ${report.total} Full cases; ${report.failures.length} unexpected final results, ${report.flaky.length} recovered/flaky cases, ${report.skipped.length} skipped. Skips are not passes.\n\nPlan hash: ${report.planHash}\nExecution session: ${report.executionSession ?? report.executionThread}\nEnvironment: ${JSON.stringify(report.environment)}\nReviewed by: ${review.reviewedBy}\nEvidence bundle sha256 identity: ${report.evidenceHash}\n\n${links.map(link => `- ${link.problem}: ${link.issue} (${link.state}; no automatic reopening)`).join('\n') || 'No unexpected final failures.'}\n\nFlaky case identities: ${report.flaky.length} (complete identities in local report bundle)\nSkipped case identities: ${report.skipped.length} (complete identities in local report bundle)\n\nLocal retained evidence (not uploaded):\n${evidenceLocation(report)} (file sha256 ${hash(json(report))}); contains every attempt receipt/journal/artifact path and recorded sha256\n\nThese results apply only to this Full snapshot. Base coverage is separate. Findings enter the normal work queue; merging is not blocked. Repairs may use any suitable session after completion. A Full rerun needs a new issue, human approval and independent execution session.\n`
    const comments = api(['--paginate', '--slurp', `repos/${run.repo}/issues/${run.number}/comments`]).flat(), existing = comments.filter(comment => comment.body?.includes(marker))
    if (existing.length > 1) throw Error('Duplicate run report markers require review')
    const comment = existing.length ? writeApi(`repos/${run.repo}/issues/comments/${existing[0].id}`, {body}, 'PATCH') : writeApi(`repos/${run.repo}/issues/${run.number}/comments`, {body})
    journal.report = {comment: comment.id, evidenceHash: report.evidenceHash}; atomic(journalFile, journal)
    return {reportComment: comment.html_url, findings: links}
  } finally { fs.rmSync(lock, {force: true}) }
}

export function repairHandoff(number, reviewFile, problemKey) {
  const {run, report} = completedRunReport(number), review = read(reviewFile)
  validateReview(report, review)
  const group = review.groups.find(item => item.problemKey === problemKey)
  if (!group) throw Error('Unknown reviewed problem key')
  const directory = path.join(run.paths.directory, 'reporting'); fs.mkdirSync(directory, {recursive: true})
  const journalFile = path.join(directory, 'publication.json'), published = fs.existsSync(journalFile) ? read(journalFile).groups?.[problemKey] : null
  const issue = published?.url
  if (!issue || published.evidenceHash !== report.evidenceHash || published.groupHash !== hash(json(group))) throw Error('Publish/link this reviewed finding and evidence before creating its repair handoff')
  const file = path.join(directory, `repair-${problemKey}.md`)
  fs.writeFileSync(file, `# Repair handoff: ${group.title}\n\nFinding issue: ${issue}\n\n${findingBody(report, group)}`)
  return {handoff: file, issue, sessionCreated: false, fullExecutionAuthorized: false}
}
