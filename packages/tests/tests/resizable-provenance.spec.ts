import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import{test,expect}from"./verified-test"
import{readFileSync}from"node:fs"
import{createHash}from"node:crypto"
import{PNG}from"pngjs"
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex"),directory="tests/reference/resizable"
test("Historical scrollbar grip pixels remain exact crops from both original native launches and retained fullframes",()=>{
 const manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, testRoot),"utf8")),proofBytes=readFileSync(resolveRepositoryPath(`${directory}/crop-derivation.json`, testRoot)),proof=JSON.parse(proofBytes.toString()),repeat=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/repeatability.json`, testRoot),"utf8"))
 expect(hash(proofBytes)).toBe(manifest.derivation.cropProvenanceSha256)
 expect(hash(readFileSync(resolveRepositoryPath(manifest.derivation.sourceManifest, testRoot)))).toBe(manifest.derivation.sourceManifestSha256)
 for(const c of proof.cases){
  const expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, testRoot))),againBytes=readFileSync(resolveRepositoryPath(`${directory}/repeat-crops/${c.name}`, testRoot)),again=PNG.sync.read(againBytes),parentBytes=readFileSync(resolveRepositoryPath(`tests/reference/scroll-area/captures/${c.parentCase}`, testRoot)),frameBytes=readFileSync(resolveRepositoryPath(`tests/reference/scroll-area/frames/${c.parentFullFrame}`, testRoot)),repeatFrameBytes=readFileSync(resolveRepositoryPath(`${directory}/repeat-frames/${c.parentFullFrame}`, testRoot))
  expect(hash(parentBytes)).toBe(c.parentPngSha256);expect(hash(frameBytes)).toBe(c.parentFullFrameSha256);expect(hash(repeatFrameBytes)).toBe(c.parentRepeatFullFrameSha256)
  expect(hash(againBytes)).toBe(repeat.cases.find((r:{name:string})=>r.name===c.name).runTwoPngSha256);expect(again.data.equals(expected.data)).toBe(true)
  for(const[bytes,rect]of[[parentBytes,c.cropWithinParent],[frameBytes,c.cropWithinFullFrame],[repeatFrameBytes,c.cropWithinFullFrame]] as const){
   const source=PNG.sync.read(bytes),data=Buffer.alloc(rect.width*rect.height*4)
   for(let y=0;y<rect.height;y++){const start=((rect.y+y)*source.width+rect.x)*4;source.data.copy(data,y*rect.width*4,start,start+rect.width*4)}
   expect([rect.width,rect.height]).toEqual([expected.width,expected.height]);expect(data.equals(expected.data)).toBe(true)
  }
 }
})
test("Resizable ships unchanged original recipe-book arrow PNG artwork",()=>{
 const provenance=JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/pagination-arrow/asset-provenance.json", testRoot),"utf8")),css=readFileSync(resolveRepositoryPath("registry/ui/minecraft-resizable-assets.css", testRoot),"utf8")
 let count=0
 for(const match of css.matchAll(/\.mc-resizable-arrow\[data-direction="(backward|forward)"\]\s*\{([\s\S]*?)\}/g)){
  const images=[...match[2].matchAll(/data:image\/png;base64,([^"\)]+)/g)]
  expect(images).toHaveLength(2)
  for(const[index,image]of images.entries()){const member=`assets/minecraft/textures/gui/sprites/recipe_book/page_${match[1]}${index?"_highlighted":""}.png`;expect(hash(Buffer.from(image[1],"base64"))).toBe(provenance.sources[member].sha256);count++}
 }
 expect(count).toBe(4);expect(readFileSync(resolveRepositoryPath("registry/ui/resizable.tsx", testRoot),"utf8")).toContain('import "./minecraft-resizable-assets.css"')
})
