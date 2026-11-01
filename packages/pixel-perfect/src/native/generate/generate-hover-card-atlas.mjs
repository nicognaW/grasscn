import {resolveRepositoryPath} from '@ppt/paths'
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"

const base = new URL("../../../tests/reference/hover-card", import.meta.url)
const provenance = JSON.parse(await readFile(new URL("asset-provenance.json", base), "utf8"))
const bytes = await readFile(new URL("glyph-atlas.json", base))
assert.equal(createHash("sha256").update(bytes).digest("hex"), provenance.glyphAtlasSha256)
const source = await readFile(new URL("source/ControlsReferenceMain.java", base))
assert.equal(createHash("sha256").update(source).digest("hex"), provenance.glyphProbeSourceSha256)
const atlas = JSON.parse(bytes)
const keys = ["u0", "u1", "v0", "v1", "left", "right", "up", "down", "advance", "boldOffset", "shadowOffset"]
for (const [code, glyph] of Object.entries(atlas)) {
  assert.match(code, /^[0-9a-f]+$/)
  for (const key of keys) assert.ok(Number.isFinite(glyph[key]), `${code}: missing ${key}`)
  assert.ok(glyph.u1 > glyph.u0 && glyph.v1 > glyph.v0)
}
await writeFile(resolveRepositoryPath("registry/ui/minecraft-hover-card-atlas.ts"),
  `export type HoverCardGlyph = {${keys.map(key => `${key}:number`).join(";")}}\n` +
  "// Original baked glyph geometry and UVs observed in the native Hover Card cases.\n" +
  `export const hoverCardGlyphAtlas: Record<string,HoverCardGlyph> = ${JSON.stringify(atlas)}\n`)
console.log(`Generated ${Object.keys(atlas).length} original Hover Card glyph metrics and UVs`)
