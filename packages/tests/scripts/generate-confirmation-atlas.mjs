import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import {createHash} from "node:crypto"
import {readFile,writeFile} from "node:fs/promises"

const base=new URL("../tests/reference/alert-dialog/",import.meta.url),bytes=await readFile(new URL("glyph-atlas.json",base))
const provenance=JSON.parse(await readFile(new URL("asset-provenance.json",base),"utf8"))
assert.equal(createHash("sha256").update(bytes).digest("hex"),provenance.glyphAtlasSha256)
const atlas=Object.fromEntries(Object.entries(JSON.parse(bytes)).map(([code,{u0,u1,v0,v1}])=>[code,{u0,u1,v0,v1}]))
await writeFile(resolveRepositoryPath("registry/ui/minecraft-confirmation-atlas.ts"),'import type { UnihexAtlas } from "./minecraft-unifont-gpu"\n// Original glyph UVs observed in the ConfirmScreen native loading context.\nexport const confirmationUnihexAtlas: UnihexAtlas = '+JSON.stringify(atlas)+'\n')
console.log(`Generated ${Object.keys(atlas).length} original confirmation glyph coordinates`)
