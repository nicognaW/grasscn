import assert from "node:assert/strict"
import {test} from "node:test"
import {copyFile, mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises"
import {spawnSync} from "node:child_process"
import path from "node:path"
import {fileURLToPath} from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(root, "test-results")
async function fixture(run) {
  await mkdir(output, {recursive: true})
  const directory = await mkdtemp(path.join(output, "primitives-"))
  const json = (name, value) => writeFile(path.join(directory, name), JSON.stringify(value))
  try {
    for (const folder of ["scripts", "registry/ui", "preview", "public/r"]) await mkdir(path.join(directory, folder), {recursive: true})
    await copyFile(path.join(root, "scripts/check-primitives.mjs"), path.join(directory, "scripts/check-primitives.mjs"))
    await json("package.json", {type: "module", dependencies: {"@base-ui/react": "1.9.0"}})
    await json("package-lock.json", {packages: {"node_modules/@base-ui/react": {version: "1.9.0"}}})
    await json("registry.json", {items: [{name: "button", dependencies: ["@base-ui/react"], files: []}]})
    await json("public/r/button.json", {dependencies: ["@base-ui/react"], files: []})
    await json("public/r/registry.json", {items: []})
    const check = (...args) => spawnSync(process.execPath, ["scripts/check-primitives.mjs", ...args], {cwd: directory, encoding: "utf8"})
    await run({directory, json, check})
  } finally {
    assert.equal(path.dirname(directory), output)
    assert.ok(path.basename(directory).startsWith("primitives-"))
    await rm(directory, {recursive: true, force: true})
  }
}

test("primitive policy rejects direct, transitive and optional Radix routes", async () => fixture(async ({json, check}) => {
  assert.equal(check().status, 0)
  await json("package.json", {dependencies: {"radix-ui": "1.0.0"}})
  let result = check()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /package\.json dependencies: radix-ui/)
  await json("package.json", {dependencies: {"@base-ui/react": "1.9.0"}})
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    await json("package-lock.json", {packages: {"node_modules/example": {[field]: {"@radix-ui/react-dialog": "1.0.0"}}}})
    result = check()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /example -> @radix-ui\/react-dialog/)
  }
}))

test("primitive policy checks built source and catches obsolete registry payloads", async () => fixture(async ({directory, json, check}) => {
  assert.equal(check("--built").status, 0)
  await json("public/r/button.json", {files: [{path: "button.tsx", content: 'import {Command} from "cmdk"'}]})
  let result = check("--built")
  assert.equal(result.status, 1)
  assert.match(result.stderr, /built button\/button\.tsx: cmdk/)
  await json("public/r/button.json", {files: []})
  await json("public/r/removed-component.json", {})
  result = check("--built")
  assert.equal(result.status, 1)
  assert.match(result.stderr, /obsolete built payload: removed-component\.json/)
  assert.ok((await readFile(path.join(directory, "public/r/removed-component.json"))).length)
}))

test("primitive policy rejects version-pinned packages in registry payloads", async () => fixture(async ({json, check}) => {
  for (const dependency of ["vaul@1.1.2", "cmdk@1.1.1", "radix-ui@1.0.0", "@radix-ui/react-dialog@1.0.0"]) {
    await json("registry.json", {items: [{name: "button", dependencies: [dependency]}]})
    assert.equal(check().status, 1, dependency)
    await json("registry.json", {items: [{name: "button", dependencies: ["@base-ui/react"]}]})
    await json("public/r/button.json", {dependencies: [dependency], files: []})
    assert.equal(check("--built").status, 1, dependency)
  }
}))

test("upstream cmdk may carry Radix, but a shared dependency must not create another route", async () => fixture(async ({json, check}) => {
  await json("package.json", {dependencies: {"@base-ui/react": "1.9.0", cmdk: "1.1.1"}})
  const packages = {
    "node_modules/cmdk": {dependencies: {shared: "1.0.0"}},
    "node_modules/shared": {dependencies: {"@radix-ui/react-dialog": "1.1.6"}},
    "node_modules/@radix-ui/react-dialog": {version: "1.1.6"},
  }
  await json("package-lock.json", {packages})
  assert.equal(check().status, 0)
  await json("package.json", {dependencies: {cmdk: "1.1.1", shared: "1.0.0"}})
  const result = check()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /lockfile: node_modules\/@radix-ui\/react-dialog/)
}))

test("cmdk is restricted to Command source and registry closures containing Command", async () => fixture(async ({directory, json, check}) => {
  await writeFile(path.join(directory, "registry/ui/command.tsx"), 'import {Command} from "cmdk"')
  const item = {name: "command", dependencies: ["cmdk@1.1.1"], files: [{path: "registry/ui/command.tsx"}]}
  await json("registry.json", {items: [item]})
  await json("public/r/command.json", {dependencies: item.dependencies, files: [{path: "registry/ui/command.tsx", content: 'import {Command} from "cmdk"'}]})
  await json("registry.json", {items: [{name: "button", dependencies: ["@base-ui/react"], files: []}, item]})
  assert.equal(check("--built").status, 0)
  await writeFile(path.join(directory, "preview/bad.tsx"), 'import {Command} from "cmdk"')
  const result = check()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /preview\/bad\.tsx: cmdk/)
}))
