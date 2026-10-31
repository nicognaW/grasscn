import assert from "node:assert/strict"
import {createHash} from "node:crypto"
import {mkdir,readdir,readFile,writeFile,stat} from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),output=path.resolve(process.argv[2]??"");assert.ok(process.argv[2],"Pass a new snapshot directory");await mkdir(output,{recursive:false});const files=new Set()
async function walk(directory,predicate=()=>true){for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){const name=path.posix.join(directory,entry.name);if(entry.isDirectory())await walk(name,predicate);else if(predicate(name))files.add(name)}}
await walk("registry");await walk("preview");await walk("tests/fixture");for(const entry of await readdir(path.join(root,"tests"))){if(/\.(?:ts|tsx|js)$/.test(entry))files.add("tests/"+entry)}
for(const file of ["registry.json","package.json","package-lock.json","tsconfig.json","playwright.config.ts","vite.config.ts","vite.preview.config.ts","scripts/check-map.mjs","scripts/check-registry-closure.mjs","scripts/prepare-preview.mjs","scripts/checkpoint-reporter.mjs",".agents/skills/port-minecraft-ui/SKILL.md"])files.add(file)
await walk("tests/reference",name=>/\.(?:json|java|mjs)$/.test(name));const records=[];for(const file of [...files].sort()){const bytes=await readFile(path.join(root,file)),target=path.join(output,"sources",file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);records.push({path:file,sha256:createHash("sha256").update(bytes).digest("hex"),bytes:bytes.length})}
const map=JSON.parse(await readFile(path.join(root,"registry/minecraft-map.json"),"utf8"));await writeFile(path.join(output,"source-manifest.json"),JSON.stringify({capturedAt:new Date().toISOString(),node:process.version,minecraftVersion:map.minecraftVersion,sourceJarSha256:map.sourceJarSha256,components:map.components.map(c=>({name:c.name,status:c.implementation.status,pixels:c.pixelVerification.status})),files:records},null,2)+"\n");console.log(`Retained ${records.length} exact source/provenance files in ${output}`)
