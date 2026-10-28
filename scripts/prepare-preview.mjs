import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const json = async file => JSON.parse(await readFile(path.join(root, file), "utf8"))
const map = await json("registry/minecraft-map.json"), registry = await json("registry.json")
const demosArgument = process.argv.indexOf("--demos")
const demos = JSON.parse(await readFile(path.resolve(root, demosArgument < 0 ? "preview/demos.json" : process.argv[demosArgument + 1]), "utf8"))
const completed = map.components.filter(c => ["installed-pilot", "implemented-and-install-verified"].includes(c.implementation.status))
const expected = completed.map(c => c.name).sort(), actual = demos.map(d => d.name).sort()
assert.equal(new Set(actual).size, actual.length, "Duplicate preview registration")
assert.deepEqual(actual, expected, "Every finished component needs a preview; unfinished components must not be presented as finished")
const modules = (await readdir(path.join(root, "preview/demos"))).filter(file => file.endsWith(".tsx")).map(file => file.slice(0, -4)).sort()
assert.deepEqual(modules, actual, "Preview registrations and executable demo modules differ")
const components = []
for (const demo of demos) {
  const component = completed.find(c => c.name === demo.name)
  const item = registry.items.find(item => item.name === component.implementation.registryItem)
  assert.ok(item && component.pixelVerification.manifest, `${demo.name}: missing registry item or native reference`)
  const manifest = await json(component.pixelVerification.manifest)
  const source = createHash("sha256")
  for (const file of item.files) source.update(await readFile(path.join(root, file.path)))
  source.update(await readFile(path.join(root, "preview/demos", `${demo.name}.tsx`)))
  components.push({ ...demo, referenceCases: manifest.cases.length, scope: component.pixelVerification.scope,
    minecraftVersion: manifest.minecraftVersion, sourceRevision: source.digest("hex") })
}
const payload = { total: map.components.length, components }
let previous
try { previous = await json("preview/catalog.generated.json") } catch {}
const stable = previous && JSON.stringify({ total: previous.total, components: previous.components }) === JSON.stringify(payload)
const catalog = { ...payload, updatedAt: stable ? previous.updatedAt : new Date().toISOString() }
await writeFile(path.join(root, "preview/catalog.generated.json"), JSON.stringify(catalog, null, 2) + "\n")
console.log(`Preview coverage: ${actual.length}/${completed.length} finished components; ${components.reduce((sum, c) => sum + c.referenceCases, 0)} native reference cases`)
