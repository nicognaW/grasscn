import { test } from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdir, mkdtemp, writeFile, access, rm } from "node:fs/promises"
import path from "node:path"
import { once } from "node:events"

async function fixture(run) {
  await mkdir(path.resolve("test-results"), { recursive: true })
  const root = await mkdtemp(path.resolve("test-results/guarded-entry-"))
  const gate = path.join(root, "gate.json"), marker = path.join(root, "ran.txt"), target = path.join(root, "payload.mjs")
  await writeFile(target, 'import {writeFile} from "node:fs/promises"; await writeFile(process.argv[2], "ran")')
  const child = spawn(process.execPath, ["scripts/guarded-entry.mjs", gate, target, marker], { stdio: "ignore" })
  const exited = once(child, "exit")
  try { await run({ child, exited, gate, marker }) }
  finally { if (child.exitCode === null) child.kill(); await exited; await rm(root, { recursive: true, force: true }) }
}

test("workload waits for enforced budgets before executing", () => fixture(async ({child, exited, gate, marker}) => {
  await new Promise(resolve => setTimeout(resolve, 150))
  await assert.rejects(access(marker))
  await writeFile(gate, JSON.stringify({pid: child.pid, enforced: true}))
  assert.equal((await exited)[0], 0)
  await access(marker)
}))

test("another process's budget gate cannot start the workload", () => fixture(async ({child, exited, gate, marker}) => {
  await writeFile(gate, JSON.stringify({pid: child.pid + 1, enforced: true}))
  assert.notEqual((await exited)[0], 0)
  await assert.rejects(access(marker))
}))
