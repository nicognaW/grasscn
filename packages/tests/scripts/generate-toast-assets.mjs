import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import {readFile,writeFile} from "node:fs/promises"
import path from "node:path"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
const directory=process.argv[2]
assert.ok(directory,"Pass a directory containing the original system.png and system.png.mcmeta")
const hash=bytes=>createHash("sha256").update(bytes).digest("hex"),inventory=JSON.parse(await readFile(resolveRepositoryPath("tests/reference/catalog/native-inventory.json"),"utf8")),member="assets/minecraft/textures/gui/sprites/toast/system.png",pin=inventory.assets[member]
const bytes=await readFile(path.join(directory,"system.png")),metadata=await readFile(path.join(directory,"system.png.mcmeta"))
assert.equal(hash(bytes),pin.sha256);assert.equal(hash(metadata),pin.metadataSha256)
const image=PNG.sync.read(bytes),scaling=JSON.parse(metadata).gui.scaling
assert.equal(scaling.type,"nine_slice");assert.deepEqual([image.width,image.height],[160,64]);assert.ok(image.data.every((channel,index)=>index%4!==3||channel===255))
const sprite={width:image.width,height:image.height,image:`data:image/png;base64,${bytes.toString("base64")}`,rgba:image.data.toString("base64"),border:scaling.border,stretch:scaling.stretch_inner??false}
await writeFile(resolveRepositoryPath("registry/ui/minecraft-toast-assets.ts"),`export const minecraftToastSprite = ${JSON.stringify(sprite)} as const\n`)
const glyphs=JSON.parse(await readFile(resolveRepositoryPath("tests/reference/toast/glyph-atlas.json"),"utf8")),observations=JSON.parse(await readFile(resolveRepositoryPath("tests/reference/toast/toast-atlas.json"),"utf8")),native=Object.values(observations)[0]
const width=Math.round(image.width/(native.u1-native.u0)),height=Math.round(image.height/(native.v1-native.v0)),atlas={...native,width,height,x:Math.round(native.u0*width),y:Math.round(native.v0*height)}
const type="Record<string,{u0:number;u1:number;v0:number;v1:number;left:number;right:number;up:number;down:number;advance:number;boldOffset:number;shadowOffset:number}>"
await writeFile(resolveRepositoryPath("registry/ui/minecraft-toast-atlas.ts"),`export const toastGlyphAtlas:${type} = ${JSON.stringify(glyphs)}\nexport const toastSpriteAtlas = ${JSON.stringify(atlas)} as const\n`)
console.log(`Generated original SystemToast PNG/RGBA, ${Object.keys(glyphs).length} observed glyphs and ${width}x${height} original GUI atlas placement`)
