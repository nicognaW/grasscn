import fs from "node:fs"
import {spawnSync} from "node:child_process"
import path from "node:path"
import {foregroundLease} from "@grasscn/tests/coordination"
import {testRoot, packageBin} from "../../../workspace-paths.mjs"

const args = process.argv.slice(2)
const releaseForeground = foregroundLease()
const execute = command => {
  const result = spawnSync(process.execPath, command, {cwd: testRoot, stdio: "inherit", env: {...process.env, GRASSCN_BROWSER_SCOPE: "ordinary"}})
  if (result.error) throw result.error
  return result.status ?? 1
}
try {
  const units = fs.readdirSync(path.join(testRoot, "tests")).filter(name => name.endsWith(".test.mjs")).map(name => path.join(testRoot, "tests", name))
  const unitStatus = args.includes("--list") ? 0 : execute(["test", "--timeout", "120000", ...units])
  process.exitCode = unitStatus || execute([packageBin("@playwright/test", "playwright", testRoot), "test", "--config", path.join(testRoot, "playwright.config.ts"), ...args])
} finally {
  releaseForeground()
}
