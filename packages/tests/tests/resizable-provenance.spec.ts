import{test,expect}from"./verified-test"
import{readFileSync}from"node:fs"
import{createHash}from"node:crypto"
import{PNG}from"pngjs"
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex"),directory="tests/reference/resizable"
test("Historical scrollbar grip pixels remain exact crops from both original native launches and retained fullframes",()=>{
 const manifest=JSON.parse(readFileSync(`${directory}/manifest.json`,"utf8")),proofBytes=readFileSync(`${directory}/crop-derivation.json`),proof=JSON.parse(proofBytes.toString()),repeat=JSON.parse(readFileSync(`${directory}/repeatability.json`,"utf8"))
 expect(hash(proofBytes)).toBe(manifest.derivation.cropProvenanceSha256)
 expect(hash(readFileSync(manifest.derivation.sourceManifest))).toBe(manifest.derivation.sourceManifestSha256)
 for(const c of proof.cases){
  const expected=PNG.sync.read(readFileSync(`${directory}/captures/${c.name}`)),againBytes=readFileSync(`${directory}/repeat-crops/${c.name}`),again=PNG.sync.read(againBytes),parentBytes=readFileSync(`tests/reference/scroll-area/captures/${c.parentCase}`),frameBytes=readFileSync(`tests/reference/scroll-area/frames/${c.parentFullFrame}`),repeatFrameBytes=readFileSync(`${directory}/repeat-frames/${c.parentFullFrame}`)
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
 const provenance=JSON.parse(readFileSync("tests/reference/pagination-arrow/asset-provenance.json","utf8")),css=readFileSync("registry/ui/minecraft-resizable-assets.css","utf8")
 let count=0
 for(const match of css.matchAll(/\.mc-resizable-arrow\[data-direction="(backward|forward)"\]\s*\{([\s\S]*?)\}/g)){
  const images=[...match[2].matchAll(/data:image\/png;base64,([^"\)]+)/g)]
  expect(images).toHaveLength(2)
  for(const[index,image]of images.entries()){const member=`assets/minecraft/textures/gui/sprites/recipe_book/page_${match[1]}${index?"_highlighted":""}.png`;expect(hash(Buffer.from(image[1],"base64"))).toBe(provenance.sources[member].sha256);count++}
 }
 expect(count).toBe(4);expect(readFileSync("registry/ui/resizable.tsx","utf8")).toContain('import "./minecraft-resizable-assets.css"')
})
