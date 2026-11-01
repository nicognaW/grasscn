import {test,expect} from "./verified-test"
import {readFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
import {minecraftToastSprite} from "../../../apps/web/registry/ui/minecraft-toast-assets"
import {toastGlyphAtlas,toastSpriteAtlas} from "../../../apps/web/registry/ui/minecraft-toast-atlas"
import {minecraftToastSounds} from "../../../apps/web/registry/ui/minecraft-toast-sound-assets"
const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex")
test("SystemToast retains original PNG bytes, RGBA and asymmetric nine-slice metadata",()=>{
 const inventory=JSON.parse(readFileSync("tests/reference/catalog/native-inventory.json","utf8")),pin=inventory.assets["assets/minecraft/textures/gui/sprites/toast/system.png"],bytes=Buffer.from(minecraftToastSprite.image.split(",")[1],"base64"),image=PNG.sync.read(bytes)
 expect(hash(bytes)).toBe(pin.sha256);expect(Buffer.from(minecraftToastSprite.rgba,"base64")).toEqual(image.data);expect([image.width,image.height]).toEqual([160,64]);expect(minecraftToastSprite.border).toEqual(pin.metadata.gui.scaling.border);expect(minecraftToastSprite.stretch).toBe(false)
})
test("SystemToast uses the UVs and metrics observed in its normalized native context",()=>{
 const glyphs=JSON.parse(readFileSync("tests/reference/toast/glyph-atlas.json","utf8")),observed=Object.values(JSON.parse(readFileSync("tests/reference/toast/toast-atlas.json","utf8")))[0] as any
 expect(toastGlyphAtlas).toEqual(glyphs);expect(Object.keys(glyphs)).toHaveLength(112)
 expect(toastSpriteAtlas.width).toBe(Math.round(160/(observed.u1-observed.u0)));expect(toastSpriteAtlas.height).toBe(Math.round(64/(observed.v1-observed.v0)))
 expect(toastSpriteAtlas.x).toBe(Math.round(observed.u0*toastSpriteAtlas.width));expect(toastSpriteAtlas.y).toBe(Math.round(observed.v0*toastSpriteAtlas.height))
})
test("Toast original sound assets and native gain match the effective asset index",()=>{
 const provenance=JSON.parse(readFileSync("tests/reference/toast/sound-provenance.json","utf8"))
 for(const kind of ["in","out"] as const){const source=provenance.events[`ui.toast.${kind}`];expect(hash(Buffer.from(minecraftToastSounds[kind].split(",")[1],"base64"))).toBe(source.asset.sha256);expect(source.definition.sounds[0].volume).toBe(.4);expect(source.nativePitch).toBe(1);expect(source.nativeVolume).toBe(1)}
})
