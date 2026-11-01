import {resolveRepositoryPath} from '@ppt/paths'
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const base = new URL("../../../tests/reference/label", import.meta.url)
const provenance = JSON.parse(await readFile(new URL("asset-provenance.json", base), "utf8"))
const bytes = await readFile(new URL("glyph-atlas.json", base))
assert.equal(createHash("sha256").update(bytes).digest("hex"), provenance.glyphAtlasSha256)
const observed = JSON.parse(bytes)
const atlas = Object.fromEntries(Object.entries(observed).map(([code, { u0, u1, v0, v1 }]) => [code, { u0, u1, v0, v1 }]))
const target = resolveRepositoryPath("registry/ui/minecraft-label-atlas.ts")
await writeFile(target, "// Original default-font UVs observed in the Label native capture; pixels come from the original Unihex archive.\nexport const labelUnihexAtlas = " + JSON.stringify(atlas) + "\n")
console.log(`Generated ${Object.keys(atlas).length} observed glyph coordinates: ${fileURLToPath(target)}`)
