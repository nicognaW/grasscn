import assert from "node:assert/strict"
import {readFile} from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..")
const registry=JSON.parse(await readFile(path.join(root,"registry.json"),"utf8")),errors=[],sources=new Map()
for(const item of registry.items){
 const included=new Set(item.files.map(file=>path.resolve(root,file.path)))
 for(const file of item.files){
  const absolute=path.resolve(root,file.path)
  if(!sources.has(absolute))sources.set(absolute,await readFile(absolute,"utf8"))
  const source=sources.get(absolute)
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'])(\.[^"']+)\1/g)){
   const target=path.resolve(path.dirname(absolute),match[2])
   if(![target,...[".ts",".tsx",".css",".json"].map(extension=>target+extension),path.join(target,"index.ts"),path.join(target,"index.tsx")].some(candidate=>included.has(candidate)))errors.push(`${item.name}: ${path.basename(file.path)} requires ${match[2]}`)
  }
 }
}
assert.deepEqual(errors,[],`Registry items must include static and lazy relative imports:\n${errors.join("\n")}`)
console.log(`Registry closure: ${registry.items.length} self-contained items, including lazy imports`)
