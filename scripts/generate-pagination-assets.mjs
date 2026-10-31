import assert from "node:assert/strict"
import {readFile,writeFile} from "node:fs/promises"
import path from "node:path"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"

const directory=process.argv[2]
assert.ok(directory,"Pass a directory containing the four original recipe_book/page_*.png assets")
const inventory=JSON.parse(await readFile("tests/reference/catalog/native-inventory.json","utf8")),hash=bytes=>createHash("sha256").update(bytes).digest("hex")
let css="@layer components {\n"
const sources={}
for(const direction of ["backward","forward"]){
 css+=`.mc-pagination-arrow[data-direction="${direction}"] {\n`
 for(const highlighted of [false,true]){
  const name=`page_${direction}${highlighted?"_highlighted":""}.png`,member=`assets/minecraft/textures/gui/sprites/recipe_book/${name}`,bytes=await readFile(path.join(directory,name)),image=PNG.sync.read(bytes)
  assert.equal(hash(bytes),inventory.assets[member].sha256);assert.deepEqual([image.width,image.height],[12,17])
  assert.ok(Array.from(image.data).filter((_,index)=>index%4===3).every(alpha=>alpha===0||alpha===255))
  css+=` --mc-pagination-arrow${highlighted?"-highlighted":""}:url("data:image/png;base64,${bytes.toString("base64")}");\n`
  sources[member]={sha256:hash(bytes),width:image.width,height:image.height,alphaValues:[0,255]}
 }
 css+="}\n"
}
css+="}\n"
await writeFile("registry/ui/minecraft-pagination-assets.css",css)
console.log(`Generated four original12×17 recipe-book page arrow sprites; pinned artifact${inventory.jarSha256}`)
