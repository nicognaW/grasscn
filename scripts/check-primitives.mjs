import assert from "node:assert/strict"
import {readFile, readdir} from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const json = async name => JSON.parse(await readFile(path.join(root, name), "utf8"))
const radix = name => /^(?:@radix-ui\/|radix-ui(?:@|\/|$))/.test(name)
const cmdk = name => /^cmdk(?:@|\/|$)/.test(name)
const vaul = name => /^vaul(?:@|\/|$)/.test(name)
const banned = name => radix(name) || vaul(name)
const manifest = await json("package.json")
const lock = await json("package-lock.json")
const registry = await json("registry.json")
const failures = []
// Match npm's nested/hoisted resolution using the recorded lockfile, not local node_modules.
function resolveDependency(location, name) {
  let base = location
  for (;;) {
    const candidate = `${base ? `${base}/` : ""}node_modules/${name}`
    if (lock.packages?.[candidate]) return candidate
    if (!base) return undefined
    const parent = base.lastIndexOf("/node_modules/")
    base = parent < 0 ? "" : base.slice(0, parent)
  }
}
const cmdkClosure = new Set()
const commandPackage = resolveDependency("", "cmdk")
const pending = commandPackage ? [commandPackage] : []
while (pending.length) {
  const location = pending.pop()
  if (cmdkClosure.has(location)) continue
  cmdkClosure.add(location)
  const pkg = lock.packages[location]
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      const dependency = resolveDependency(location, name)
      if (dependency) pending.push(dependency)
    }
  }
}
const outsideCmdk = new Set()
const roots = new Set(["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].flatMap(field => Object.keys(manifest[field] ?? {})))
const outsidePending = [...roots].filter(name => !cmdk(name)).map(name => resolveDependency("", name)).filter(Boolean)
while (outsidePending.length) {
  const location = outsidePending.pop()
  if (outsideCmdk.has(location)) continue
  outsideCmdk.add(location)
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const name of Object.keys(lock.packages[location][field] ?? {})) {
      const dependency = !cmdk(name) && resolveDependency(location, name)
      if (dependency) outsidePending.push(dependency)
    }
  }
}
const includesCommand = item => item.files?.some(file => /(?:^|\/)command\.tsx$/.test(file.path))
for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
  for (const name of Object.keys(manifest[field] ?? {})) {
    if (banned(name)) failures.push(`package.json ${field}: ${name}`)
  }
}
for (const [location, pkg] of Object.entries(lock.packages ?? {})) {
  const name = location.split("node_modules/").at(-1)
  if (vaul(name) || radix(name) && (!cmdkClosure.has(location) || outsideCmdk.has(location))) failures.push(`lockfile: ${location}`)
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (vaul(name) || radix(name) && (!cmdkClosure.has(location) || !cmdkClosure.has(resolveDependency(location, name)))) failures.push(`transitive ${field}: ${location} -> ${name}`)
    }
  }
}
for (const item of registry.items) {
  for (const name of item.dependencies ?? []) {
    if (banned(name) || cmdk(name) && !includesCommand(item)) failures.push(`registry ${item.name}: ${name}`)
  }
}
async function inspect(directory) {
  for (const entry of await readdir(path.join(root, directory), {withFileTypes: true})) {
    const relative = path.posix.join(directory, entry.name)
    if (entry.isDirectory()) await inspect(relative)
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      const source = await readFile(path.join(root, relative), "utf8")
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["']([^"']+)["']/g)) {
        if (banned(match[1]) || cmdk(match[1]) && relative !== "registry/ui/command.tsx") failures.push(`${relative}: ${match[1]}`)
      }
    }
  }
}
await inspect("registry")
await inspect("preview")
if (process.argv.includes("--built")) {
  const expected = new Set(["registry.json", ...registry.items.map(item => `${item.name}.json`)])
  for (const filename of await readdir(path.join(root, "public/r"))) {
    if (filename.endsWith(".json") && !expected.has(filename)) failures.push(`obsolete built payload: ${filename}`)
  }
  for (const item of registry.items) {
    const payload = await json(`public/r/${item.name}.json`)
    for (const name of payload.dependencies ?? []) {
      if (banned(name) || cmdk(name) && !includesCommand(item)) failures.push(`built ${item.name}: ${name}`)
    }
    for (const file of payload.files ?? []) {
      for (const match of (file.content ?? "").matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["']([^"']+)["']/g)) {
        if (banned(match[1]) || cmdk(match[1]) && !/(?:^|\/)command\.tsx$/.test(file.path)) failures.push(`built ${item.name}/${file.path}: ${match[1]}`)
      }
    }
  }
}
assert.deepEqual(failures, [], `Use upstream Base UI primitives; Radix is permitted only inside cmdk's dependency closure:\n${failures.join("\n")}`)
console.log("Primitives: upstream Base UI with cmdk; no direct Radix or Vaul, and no Radix dependency route outside cmdk")
