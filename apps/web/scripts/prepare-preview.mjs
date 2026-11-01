import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
const webRoot = fileURLToPath(new URL("../", import.meta.url))
const repoRoot = path.resolve(webRoot, "../..")
const webFile = name => path.resolve(webRoot, name)
const json = async file => JSON.parse(await readFile(file.startsWith("tests/reference/") ? path.resolve(webRoot, "../../packages/pixel-perfect", file) : webFile(file), "utf8"))
const map = await json("registry/minecraft-map.json"), registry = await json("registry.json")
const demosArgument = process.argv.indexOf("--demos")
const demosInput = demosArgument < 0 ? undefined : process.argv[demosArgument + 1]
const demosRelative = demosInput?.replaceAll("\\", "/")
const demosFile = demosInput === undefined ? webFile("demos.json") : path.isAbsolute(demosInput) ? demosInput : demosRelative.startsWith("preview/") ? webFile(demosRelative.slice("preview/".length)) : path.resolve(repoRoot, demosInput)
const demos = JSON.parse(await readFile(demosFile, "utf8"))
const completed = map.components.filter(c => ["installed-pilot", "implemented-and-install-verified"].includes(c.implementation.status))
const expected = completed.map(c => c.name).sort(), actual = demos.map(d => d.name).sort()
assert.equal(new Set(actual).size, actual.length, "Duplicate preview registration")
const covered = demos.flatMap(demo => [demo.name, ...(demo.includes ?? [])]).sort()
assert.equal(new Set(covered).size, covered.length, "A component must have exactly one primary or embedded demo")
assert.deepEqual(covered, expected, "Every finished component needs a primary or embedded preview")
const modules = (await readdir(webFile("demos"))).filter(file => file.endsWith(".tsx")).map(file => file.slice(0, -4)).sort()
assert.deepEqual(modules, actual, "Preview registrations and executable demo modules differ")
for(const name of modules){const source=await readFile(webFile(`demos/${name}.tsx`),"utf8");assert.match(source,/export\s+default\b|export\s*\{[^}]*\bas\s+default\b/,`${name}: preview needs a default export`);assert.match(source,/data-stage=/,`${name}: preview needs a demo stage`)}
const components = []
for (const demo of demos) {
  const componentNames = [demo.name, ...(demo.includes ?? [])]
  const members = componentNames.map(name => completed.find(component => component.name === name))
  const utility = members.every(component => component.pixelVerification.status === "not-applicable-unskinned-utility")
  const pending = members.some(component => component.pixelVerification.status === "unverified")
  let referenceCases = 0, minecraftVersion = null
  const source = createHash("sha256")
  for (const component of members) {
    const item = registry.items.find(item => item.name === component.implementation.registryItem)
    const unskinned = component.pixelVerification.status === "not-applicable-unskinned-utility"
    assert.ok(item && (unskinned || component.pixelVerification.manifest || pending), `${component.name}: missing registry item or native reference`)
    if (!unskinned && !pending) {
      for (const file of [component.pixelVerification.manifest, ...(component.pixelVerification.additionalManifests ?? [])]) {
        const manifest = await json(file)
        referenceCases += manifest.cases.length
        minecraftVersion ??= manifest.minecraftVersion
      }
    }
    source.update(component.name)
    for (const file of item.files) source.update(await readFile(webFile(file.path)))
  }
  source.update(await readFile(webFile(`demos/${demo.name}.tsx`)))
  components.push({ ...demo, componentNames, referenceCases, scope: members.map(component => component.pixelVerification.scope).filter(Boolean).join(" "),
    verificationKind: pending ? "pending" : utility ? "web-utility" : "native-cases", minecraftVersion, sourceRevision: source.digest("hex") })
}
const payload = { total: map.components.length, completedCount: covered.length, components }
let previous
try { previous = await json("catalog.generated.json") } catch {}
const stable = previous && JSON.stringify({ total: previous.total, completedCount: previous.completedCount, components: previous.components }) === JSON.stringify(payload)
const catalog = { ...payload, updatedAt: stable ? previous.updatedAt : new Date().toISOString() }
await writeFile(webFile("catalog.generated.json"), JSON.stringify(catalog, null, 2) + "\n")
const search = [],groups=await json("component-groups.json"),sourceFiles=new Set()
function componentSource(name) {
 const item=registry.items.find(item=>item.name===name)
 return item?.files.find(file=>path.basename(file.path)===`${name}.tsx`)?.path??`registry/ui/${name}.tsx`
}
function componentImport(name) {
 const item=registry.items.find(item=>item.name===name)
 const file=item?.files.find(file=>file.path===componentSource(name))
 return file?.target?.startsWith('@components/')?`@/components/${file.target.slice('@components/'.length).replace(/\.tsx?$/,'')}`:`@/components/ui/${name}`
}
async function publicExports(name){
 const text=await readFile(webFile(componentSource(name)),"utf8"),exports=new Set()
 for(const match of text.matchAll(/export\s*\{([^}]+)\}/g))for(const token of match[1].split(',')){
  const value=token.trim();if(value.startsWith('type '))continue
  const name=value.split(/\s+as\s+/).at(-1).trim()
  if(/^[A-Z]\w*$/.test(name)&&!name.includes('Skeleton'))exports.add(name)
 }
 for(const match of text.matchAll(/export\s+(?:async\s+)?function\s+([A-Z]\w*)/g))if(!match[1].includes('Skeleton'))exports.add(match[1])
 return [...exports]
}
for(const item of registry.items){
 const demo=components.find(c=>c.componentNames.includes(item.name)),members=[item.name,...(groups[item.name]??[])],exportSources={}
 for(const member of members){sourceFiles.add(member);for(const name of await publicExports(member))exportSources[name]=member}
 search.push({name:item.name,title:demo.title,category:demo.category,exports:Object.keys(exportSources),exportSources,importPaths:Object.fromEntries(members.map(member=>[member,componentImport(member)])),aliases:groups[item.name]??[],demo:demo.name})
}
await writeFile(webFile("search.generated.json"),JSON.stringify(search,null,2)+"\n")
await writeFile(webFile("component-sources.generated.ts"),'export const componentSources:Record<string,()=>Promise<string>> = {\n'+[...sourceFiles].map(name=>`  "${name}":()=>import("./${componentSource(name)}?raw").then(module=>module.default),`).join('\n')+'\n}\n')
console.log(`Preview coverage: ${covered.length}/${completed.length} components in ${actual.length} demos; ${components.reduce((sum, c) => sum + c.referenceCases, 0)} native reference cases`)
