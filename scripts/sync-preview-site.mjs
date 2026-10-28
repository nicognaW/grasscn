import assert from "node:assert/strict"
import { cp, mkdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const target = path.resolve(process.argv[2] ?? "")
if (!process.argv[2] || source === target) throw new Error("Pass the separate Site source checkout returned by the Sites source helper")
const readHosting = async root => JSON.parse(await readFile(path.join(root, ".openai/hosting.json"), "utf8"))
const original = await readHosting(source), destination = await readHosting(target)
assert.equal(destination.project_id, original.project_id, "Site identity differs; refusing to replace source")
await readFile(path.join(target, ".git/HEAD"), "utf8")
const safePath = entry => {
  const absolute = path.resolve(target, entry)
  assert.ok(absolute.startsWith(target + path.sep), "Mirror target escaped its checkout")
  return absolute
}
const folders = [".agents", "registry", "public", "scripts", "tests", "preview", "docs", "dist"]
for (const folder of folders) {
  const destinationPath = safePath(folder)
  // Only these generated mirror folders are replaced; Site identity and Git remain.
  await rm(destinationPath, { recursive: true, force: true })
  await cp(path.join(source, folder), destinationPath, { recursive: true })
}
for (const file of [".gitattributes", ".gitignore", "GLOSSARY.md", "LICENSE", "package.json", "package-lock.json", "registry.json", "tsconfig.json", "vite.config.ts", "vite.preview.config.ts", "playwright.config.ts"]) {
  await cp(path.join(source, file), safePath(file))
}
await mkdir(path.join(target, ".openai"), { recursive: true })
await cp(path.join(source, ".openai/hosting.json"), safePath(".openai/hosting.json"))
console.log(`Preview source and build synchronized for ${original.project_id}`)
