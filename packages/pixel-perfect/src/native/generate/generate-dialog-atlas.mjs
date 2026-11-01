import {resolveRepositoryPath} from '@ppt/paths'
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"

const base=new URL("../../../tests/reference/dialog-extra",import.meta.url)
const provenance=JSON.parse(await readFile(new URL("asset-provenance.json",base),"utf8"))
const bytes=await readFile(new URL("glyph-atlas.json",base))
assert.equal(createHash("sha256").update(bytes).digest("hex"),provenance.glyphAtlasSha256)
const observed=JSON.parse(bytes),atlas=Object.fromEntries(Object.entries(observed).map(([code,{u0,u1,v0,v1}])=>[code,{u0,u1,v0,v1}]))
await writeFile(resolveRepositoryPath("registry/ui/minecraft-dialog-atlas.ts"),'import type { UnihexAtlas } from "../../../scripts/minecraft-unifont-gpu"\n// Original glyph UVs observed in the Dialog native loading context.\nexport const dialogUnihexAtlas: UnihexAtlas = '+JSON.stringify(atlas)+'\n')
console.log(`Generated ${Object.keys(atlas).length} native Dialog glyph coordinates`)
