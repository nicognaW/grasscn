import {resolveRepositoryPath, pixelPerfectRoot} from '@ppt/paths'
import{pixelPerfectTest as test,expect}from"@grasscn/pixel-perfect/test"
import{readFileSync}from"node:fs"
import{createHash}from"node:crypto"
import{PNG}from"pngjs"
import{minecraftSelectAssets}from"@grasscn/web/ui/minecraft-select-assets"
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex"),directory="tests/reference/table-background"
test("Table expected grip pixels are exact crops from both original native launches and retained fullframes",()=>{
 const manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot),"utf8")),proofBytes=readFileSync(resolveRepositoryPath(`${directory}/crop-derivation.json`, pixelPerfectRoot)),proof=JSON.parse(proofBytes.toString()),repeat=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/repeatability.json`, pixelPerfectRoot),"utf8"))
 expect(hash(proofBytes)).toBe(manifest.derivation.cropProvenanceSha256)
 expect(hash(readFileSync(resolveRepositoryPath(manifest.derivation.sourceManifest, pixelPerfectRoot)))).toBe(manifest.derivation.sourceManifestSha256)
 for(const c of proof.cases){
  const expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, pixelPerfectRoot))),againBytes=readFileSync(resolveRepositoryPath(`${directory}/repeat-crops/${c.name}`, pixelPerfectRoot)),again=PNG.sync.read(againBytes),parentBytes=readFileSync(resolveRepositoryPath(`tests/reference/select/captures/${c.sourceCase}`, pixelPerfectRoot)),frameBytes=readFileSync(resolveRepositoryPath(`tests/reference/select/frames/${c.parentFullFrame}`, pixelPerfectRoot)),repeatFrameBytes=readFileSync(resolveRepositoryPath(`${directory}/repeat-frames/${c.parentFullFrame}`, pixelPerfectRoot))
  expect(hash(parentBytes)).toBe(c.parentPngSha256);expect(hash(frameBytes)).toBe(c.parentFullFrameSha256);expect(hash(repeatFrameBytes)).toBe(c.parentRepeatFullFrameSha256)
  expect(hash(againBytes)).toBe(repeat.cases.find((r:{name:string})=>r.name===c.name).runTwoPngSha256);expect(again.data.equals(expected.data)).toBe(true)
  for(const[bytes,rect]of[[parentBytes,c.cropWithinParent],[frameBytes,c.cropWithinFullFrame],[repeatFrameBytes,c.cropWithinFullFrame]] as const){
   const source=PNG.sync.read(bytes),data=Buffer.alloc(rect.width*rect.height*4)
   for(let y=0;y<rect.height;y++){const start=((rect.y+y)*source.width+rect.x)*4;source.data.copy(data,y*rect.width*4,start,start+rect.width*4)}
   expect([rect.width,rect.height]).toEqual([expected.width,expected.height]);expect(data.equals(expected.data)).toBe(true)
  }
 }
})
test("Table ships unchanged original list and separator PNG artwork",()=>{const provenance=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/asset-provenance.json`, pixelPerfectRoot),"utf8"));for(const name of ["menu_list_background","header_separator","footer_separator"] as const){const bytes=Buffer.from(minecraftSelectAssets[name].split(",")[1].split('"')[0],"base64");expect(hash(bytes)).toBe(provenance.sources[`assets/minecraft/textures/gui/${name}.png`].sha256)}})
