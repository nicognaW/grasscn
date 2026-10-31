import assert from "node:assert/strict"
import{readFile,writeFile}from"node:fs/promises"
import{createHash}from"node:crypto"
import path from"node:path"
import{PNG}from"pngjs"
const input=process.argv[2]
assert.ok(input,"Pass a directory containing the four original checkbox PNGs")
const locationFile="tests/reference/menu-parts/checkbox-atlas.json",locations=JSON.parse(await readFile(locationFile,"utf8")),inventory=JSON.parse(await readFile("tests/reference/catalog/native-inventory.json","utf8")),hash=bytes=>createHash("sha256").update(bytes).digest("hex")
const sprites={},sources={};let width,height
for(const name of ["checkbox","checkbox_highlighted","checkbox_selected","checkbox_selected_highlighted"]){
 const member=`assets/minecraft/textures/gui/sprites/widget/${name}.png`,bytes=await readFile(path.join(input,`${name}.png`));assert.equal(hash(bytes),inventory.assets[member].sha256)
 const image=PNG.sync.read(bytes),native=Object.entries(locations).find(([key])=>key.includes(`texture=minecraft:widget/${name}]`))?.[1];assert.ok(native)
 const w=Math.round(image.width/(native.u1-native.u0)),h=Math.round(image.height/(native.v1-native.v0));if(width!==undefined)assert.deepEqual([w,h],[width,height]);width=w;height=h
 sprites[name]={width:image.width,height:image.height,u0:native.u0,u1:native.u1,v0:native.v0,v1:native.v1,x:Math.round(native.u0*w),y:Math.round(native.v0*h),image:`data:image/png;base64,${bytes.toString("base64")}`,rgba:image.data.toString("base64")}
 sources[member]={sha256:hash(bytes),width:image.width,height:image.height}
}
await writeFile("registry/ui/minecraft-menu-checkbox-assets.ts",`// Original Minecraft GUI sprites and observed runtime atlas coordinates.\nexport const menuCheckboxAtlas=${JSON.stringify({width,height,sprites})} as const\n`)
await writeFile("tests/reference/menu-parts/checkbox-assets.json",JSON.stringify({sourceJarSha256:inventory.jarSha256,sources,atlasPlacementSha256:hash(await readFile(locationFile)),targetLogicalSize:17,renderer:"Native atlas UVs, original RGBA, nearest GPU sampling at the actual viewport/screen position"},null,2)+"\n")
console.log(`Generated four original checkbox sprites in the ${width}x${height} native atlas`)
