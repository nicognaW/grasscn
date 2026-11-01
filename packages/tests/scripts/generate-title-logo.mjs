import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import {readFile,writeFile} from "node:fs/promises"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
import {minecraftGlyphs} from "../../../apps/web/registry/ui/minecraft-font.ts"
import {minecraftInputAssets} from "../../../apps/web/registry/ui/minecraft-input-assets.ts"

const hash=bytes=>createHash("sha256").update(bytes).digest("hex")
const dirt=await readFile(resolveRepositoryPath("preview/assets/title-dirt.png"))
const grassSide=await readFile(resolveRepositoryPath("preview/assets/title-grass_block_side.png"))
const grassOverlay=await readFile(resolveRepositoryPath("preview/assets/title-grass_block_side_overlay.png"))
const side=PNG.sync.read(grassSide),overlay=PNG.sync.read(grassOverlay)
// The brand treatment uses a fixed green tint and nearest-neighbor texture pixels.
const tint=[124,189,107]
for(let i=0;i<side.data.length;i+=4){const alpha=overlay.data[i+3]/255;for(let c=0;c<3;c++)side.data[i+c]=Math.round(side.data[i+c]*(1-alpha)+overlay.data[i+c]*tint[c]/255*alpha)}
const grassFace=PNG.sync.write(side)
const atlasBytes=Buffer.from(minecraftInputAssets.atlas.split(",")[1],"base64"),atlas=PNG.sync.read(atlasBytes)
const pixels=[];let cursor=0
for(const char of "GRASSCN"){
 const [gx,gy,advance]=minecraftGlyphs[char.charCodeAt(0)-32]
 for(let y=0;y<8;y++)for(let x=0;x<advance;x++)if(atlas.data[((gy+y)*atlas.width+gx+x)*4+3]>0)pixels.push([cursor+x,y])
 cursor+=advance+1
}
// Expand the original bitmap strokes for the heavy main-menu wordmark.
const fine=new Set()
for(const [x,y]of pixels)for(let fy=-2;fy<7;fy++)for(let fx=-2;fx<7;fx++)fine.add(`${x*5+fx},${y*5+fy}`)
const left=11,top=5,faceHeight=35,center=130
const point=(x,y)=>[+(center+(left+x-center)*(.94+.06*y/faceHeight)).toFixed(3),top+y]
const pos=p=>p.join(",")
const rows=new Map()
for(const key of fine){const[x,y]=key.split(",").map(Number);if(!rows.has(y))rows.set(y,[]);rows.get(y).push(x)}
let path="",light="",shade=""
for(const[y,xs]of rows){
 xs.sort((a,b)=>a-b)
 let start=xs[0],last=start
 const run=()=>{path+=`M${pos(point(start,y))}L${pos(point(last+1,y))}L${pos(point(last+1,y+1))}L${pos(point(start,y+1))}Z`}
 for(const x of xs.slice(1)){if(x!==last+1){run();start=x}last=x}run()
}
for(const key of fine){const[x,y]=key.split(",").map(Number)
 if(!fine.has(`${x},${y-1}`))light+=`M${pos(point(x,y))}L${pos(point(x+1,y))}`
 if(!fine.has(`${x-1},${y}`))light+=`M${pos(point(x,y))}L${pos(point(x,y+1))}`
 if(!fine.has(`${x},${y+1}`))shade+=`M${pos(point(x,y+1))}L${pos(point(x+1,y+1))}`
 if(!fine.has(`${x+1},${y}`))shade+=`M${pos(point(x+1,y))}L${pos(point(x+1,y+1))}`
}
const depth=Array.from({length:12},(_,i)=>12-i).map(d=>`<use href="#letters" transform="translate(0 ${d})" fill="${d>7?'#251a12':'#4b3423'}"/>`).join("")
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="64" viewBox="0 0 260 64" shape-rendering="crispEdges" style="image-rendering:pixelated"><title>grasscn</title><desc>Grass-topped block lettering with dirt faces and earth-colored depth.</desc><defs><path id="letters" d="${path}"/><clipPath id="face"><use href="#letters"/></clipPath><pattern id="dirt" width="32" height="32" patternUnits="userSpaceOnUse"><image href="data:image/png;base64,${dirt.toString('base64')}" width="32" height="32"/></pattern><pattern id="grass" width="32" height="32" patternUnits="userSpaceOnUse" y="3"><image href="data:image/png;base64,${grassFace.toString('base64')}" width="32" height="32"/></pattern></defs><g>${depth}</g><use href="#letters" fill="url(#dirt)"/><g clip-path="url(#face)"><rect y="3" width="260" height="32" fill="url(#grass)"/><rect width="260" height="44" fill="#fff0bf" opacity=".12"/><path d="${light}" stroke="#b9d894" stroke-width="1" fill="none"/><path d="${shade}" stroke="#39291c" stroke-width="1" fill="none"/></g></svg>\n`
await writeFile(resolveRepositoryPath("preview/assets/grasscn-title.svg"),svg)
await writeFile(resolveRepositoryPath("preview/title.provenance.json"),JSON.stringify({composition:"Grass-topped grasscn block wordmark; original branded artwork, not a native pixel oracle",word:"GRASSCN",dimensions:[260,64],sourceJarSha256:"40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290",textures:[{member:"assets/minecraft/textures/block/dirt.png",sha256:hash(dirt)},{member:"assets/minecraft/textures/block/grass_block_side.png",sha256:hash(grassSide)},{member:"assets/minecraft/textures/block/grass_block_side_overlay.png",sha256:hash(grassOverlay)}],grassTint:tint,textureScale:2,glyphAtlasSha256:hash(atlasBytes),svgSha256:hash(Buffer.from(svg)),splash:{source:"net.minecraft.client.gui.components.SplashRenderer.extractRenderState",angleRadians:-0.34906584,sineCycleMs:1000,pulseIntervalMs:500,pulsesPerSecond:2,motionVerification:{"clock":"performance.now(), truncated to integer milliseconds","sine":"Mth 65536-entry float LUT index and value","arithmetic":"Math.fround after each Java float operation","rotation":"JOML 1.10.8 default float rotation and scale","origin":"-(textWidth / 2) with Java integer truncation, y=-8","cases":1000,"comparedFields":["pulse","scale","m00","m01","m10","m11"],"mismatches":0,"kind":"Arithmetic and transform verification, not native screenshot verification"},pulse:"1.8 - abs(sin((time % 1000) / 1000 * 2 * PI) * 0.1)",fit:"100 / (native text width + 32)",placement:"Near the lower-right of the logo, adapted inward at narrow widths",text:"Now with components!",copy:"Original project copy"},evidence:{"bytecodeDisassemblySha256":"f563f87e38687c7c64b7f392959b05d740be99ff72c9ff92a5b38ee2175f997d","reader":"JDK javap (read-only, no Minecraft execution)","logoClass":"net.minecraft.client.gui.components.LogoRenderer","splashClass":"net.minecraft.client.gui.components.SplashRenderer","nativeRuntimeCapture":"Not performed in this task; title is original branded artwork, not a native pixel oracle"}},null,2)+"\n")
console.log("Generated grasscn grass-and-dirt title")
