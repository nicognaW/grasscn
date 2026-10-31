import assert from "node:assert/strict"
import {readFile, readdir} from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const json = async name => JSON.parse(await readFile(path.join(root, name), "utf8"))
const banned = name => /^(?:@radix-ui\/|(?:radix-ui|cmdk|vaul)(?:@|\/|$))/.test(name)
const manifest = await json("package.json")
const lock = await json("package-lock.json")
const registry = await json("registry.json")
const failures = []
for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
  for (const name of Object.keys(manifest[field] ?? {})) {
    if (banned(name)) failures.push(`package.json ${field}: ${name}`)
  }
}
for (const [location, pkg] of Object.entries(lock.packages ?? {})) {
  if (banned(location.split("node_modules/").at(-1))) failures.push(`lockfile: ${location}`)
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (banned(name)) failures.push(`transitive ${field}: ${location} -> ${name}`)
    }
  }
}
for (const item of registry.items) {
  for (const name of item.dependencies ?? []) {
    if (banned(name)) failures.push(`registry ${item.name}: ${name}`)
  }
}
async function inspect(directory) {
  for (const entry of await readdir(path.join(root, directory), {withFileTypes: true})) {
    const relative = path.posix.join(directory, entry.name)
    if (entry.isDirectory()) await inspect(relative)
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      const source = await readFile(path.join(root, relative), "utf8")
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["']([^"']+)["']/g)) {
        if (banned(match[1])) failures.push(`${relative}: ${match[1]}`)
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
      if (banned(name)) failures.push(`built ${item.name}: ${name}`)
    }
    for (const file of payload.files ?? []) {
      for (const match of (file.content ?? "").matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["']([^"']+)["']/g)) {
        if (banned(match[1])) failures.push(`built ${item.name}/${file.path}: ${match[1]}`)
      }
    }
  }
}
assert.deepEqual(failures, [], `Only Base UI primitives are supported:\n${failures.join("\n")}`)
console.log("Primitives: no direct or transitive Radix, cmdk, or Vaul dependencies")
