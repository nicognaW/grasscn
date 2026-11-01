import {repoRoot, resolveRepositoryPath} from '@tests/paths'
import assert from "node:assert/strict"
import {readFile, readdir} from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"

const rootArgument = process.argv.indexOf('--root')
const root = rootArgument < 0 ? repoRoot : path.resolve(process.argv[rootArgument + 1])
const resolve = (...names) => resolveRepositoryPath(path.join(...names), root)
const json = async name => JSON.parse(await readFile(resolve(name), "utf8"))
const radix = name => /^(?:@radix-ui\/|radix-ui(?:@|\/|$))/.test(name)
const cmdk = name => /^cmdk(?:@|\/|$)/.test(name)
const vaul = name => /^vaul(?:@|\/|$)/.test(name)
const banned = name => radix(name) || vaul(name)
const manifest = await json("package.json")
const lock = Bun.JSON5.parse(await readFile(resolve("bun.lock"), "utf8"))
assert.equal(lock.lockfileVersion, 2, 'Unsupported Bun lockfile format')
const registry = await json("registry.json")
const failures = []
const packages = lock.packages ?? {}
const metadata = location => packages[location]?.[2] ?? {}
// Bun records nested resolutions under parent/package keys. Walk ancestors,
// retaining package identity instead of relying on the developer's node_modules.
function resolveDependency(location, name) {
  let base = location
  for (;;) {
    const candidate = base ? `${base}/${name}` : name
    if (packages[candidate]) return candidate
    if (!base) return undefined
    const parent = base.lastIndexOf('/')
    base = parent < 0 ? '' : base.slice(0, parent)
  }
}
const packageName = location => {
  const identity = packages[location]?.[0] ?? location
  const version = identity.lastIndexOf('@')
  return version > 0 ? identity.slice(0, version) : identity
}
const fields = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]
const transitiveFields = ["dependencies", "optionalDependencies", "peerDependencies"]
const manifests = [manifest]
for (const directory of Object.keys(lock.workspaces ?? {})) {
  if (directory) manifests.push(await json(`${directory}/package.json`))
}
const roots = manifests.flatMap(pkg => fields.flatMap(field => Object.keys(pkg[field] ?? {}).map(name => ({name, location: resolveDependency(pkg.name ?? '', name)}))))
const cmdkClosure = new Set()
const pending = roots.filter(root => cmdk(root.name)).map(root => root.location).filter(Boolean)
while (pending.length) {
  const location = pending.pop()
  if (cmdkClosure.has(location)) continue
  cmdkClosure.add(location)
  for (const field of transitiveFields) {
    for (const name of Object.keys(metadata(location)[field] ?? {})) {
      const dependency = resolveDependency(location, name)
      if (dependency) pending.push(dependency)
    }
  }
}
const outsideCmdk = new Set()
const outsidePending = roots.filter(root => !cmdk(root.name)).map(root => root.location).filter(Boolean)
while (outsidePending.length) {
  const location = outsidePending.pop()
  if (outsideCmdk.has(location)) continue
  outsideCmdk.add(location)
  for (const field of transitiveFields) {
    for (const name of Object.keys(metadata(location)[field] ?? {})) {
      const dependency = !cmdk(name) && resolveDependency(location, name)
      if (dependency) outsidePending.push(dependency)
    }
  }
}
const includesCommand = item => item.files?.some(file => /(?:^|\/)command\.tsx$/.test(file.path))
for (const current of manifests) for (const field of fields) {
  for (const name of Object.keys(current[field] ?? {})) {
    if (banned(name)) failures.push(`package.json ${field}: ${name}`)
  }
}
for (const location of Object.keys(packages)) {
  const pkg = metadata(location)
  const name = packageName(location)
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
  for (const entry of await readdir(resolve(directory), {withFileTypes: true})) {
    const relative = path.posix.join(directory, entry.name)
    if (entry.isDirectory()) { if (directory === "preview" && ["registry", "scripts", "node_modules", "dist", "public"].includes(entry.name)) continue; await inspect(relative) }
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      const source = await readFile(resolve(relative), "utf8")
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
  for (const filename of await readdir(resolve("public/r"))) {
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
