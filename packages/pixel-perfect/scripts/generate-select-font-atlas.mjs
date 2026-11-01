import {resolveRepositoryPath} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"

const directory = "tests/reference/select-extra"
const read = async file => JSON.parse(await readFile(file, "utf8"))
const manifest = await read(`${directory}/manifest.json`), repeat = await read(`${directory}/repeatability.json`)
assert.deepEqual(repeat.glyphObservationEnabled, { runOne: true, runTwo: false })
assert.equal(repeat.cases.length, manifest.cases.length)
assert.ok(repeat.cases.every(c => c.mismatchedPixels === 0))
const bytes = await readFile(`${directory}/glyph-atlas.json`), observed = JSON.parse(bytes)
const codepoints = new Set(manifest.cases.flatMap(c => Array.from((c.label ?? "") + (c.labels ?? []).join(""))).map(char => char.codePointAt(0)).filter(code => code >= 128).map(code => code.toString(16)))
assert.deepEqual(Object.keys(observed).sort(), [...codepoints].sort())
const atlas = Object.fromEntries(Object.entries(observed).map(([code, { u0, u1, v0, v1 }]) => [code, { u0, u1, v0, v1 }]))
await writeFile(resolveRepositoryPath("registry/ui/minecraft-select-atlas.ts"), "// Original baked glyph UVs observed after native Select rendering; observer-on and observer-off captures match exactly.\nexport const selectUnihexAtlas = " + JSON.stringify(atlas) + "\n")
const assets = await read("tests/reference/select/asset-provenance.json"), font = await read("tests/reference/input-cjk/asset-provenance.json")
await writeFile(`${directory}/asset-provenance.json`, JSON.stringify({ ...assets, sources: { ...assets.sources, ...font.sources }, glyphAtlasSha256: createHash("sha256").update(bytes).digest("hex"), glyphProbeSource: `${directory}/source/ControlsReferenceMain.java`, glyphProbeSourceSha256: manifest.captureSourceSha256, glyphObservationVerification: "repeatability.json", glyphAtlasContext: "Original default-font glyphs observed after stable native select frames. Every glyph is rendered in a fitting title before observation. Independent observer-disabled launch has identical decoded RGBA pixels. Popup uses the original language-selection list and entries; dropdown behavior is a web composition." }, null, 2) + "\n")
console.log(`Generated ${Object.keys(atlas).length} native Select glyph coordinates with non-mutating observation evidence`)
