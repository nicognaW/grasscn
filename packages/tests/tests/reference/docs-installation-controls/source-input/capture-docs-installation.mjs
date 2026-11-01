import path from "node:path"
import { readFile, readdir, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { createHash } from "node:crypto"
const root = "C:/Users/admin/Documents/Codex/2026-10-28/hel/outputs/grasscn"
const output = path.join(root, ".pixel-perfect-test/next-docs-installation")
const require = createRequire(path.join(root, ".native-reference/nx-16/packages/tests/package.json"))
const { PNG } = require("pngjs")
for (const launch of ["a", "b"]) {
  const child = Bun.spawn([process.execPath, path.join(output,"source-input/capture-controls.mjs"), "C:/Users/admin/mc/.minecraft/versions/Everything Voxy 26.2", "C:/Users/admin/AppData/Roaming/.hmcl/java/windows-x86_64/mojang-java-runtime-epsilon/bin", path.join(output,"cases.json")], {
    cwd: root, env: {...process.env, MINECRAFT_REFERENCE_WORK_DIR:path.join(output,"runtime-"+launch), MINECRAFT_REFERENCE_OUTPUT_DIR:path.join(output,"native-"+launch), MINECRAFT_REFERENCE_SOURCE:path.join(output,"source-input/ControlsReferenceMain.java")},
    stdout:"inherit",stderr:"inherit"
  })
  assert.equal(await child.exited,0,"Native launch failed: "+launch)
}
const files = (await readdir(path.join(output,"native-a/captures"))).filter(name=>name.endsWith(".png")).sort()
assert.equal(files.length,72)
const cases=[]
for(const name of files){
  const first=PNG.sync.read(await readFile(path.join(output,"native-a/captures",name)))
  const second=PNG.sync.read(await readFile(path.join(output,"native-b/captures",name)))
  assert.deepEqual([first.width,first.height],[second.width,second.height])
  assert(first.data.equals(second.data),"Independent launch mismatch: "+name)
  cases.push({name,width:first.width,height:first.height,differingPixels:0,decodedRgbaSha256:createHash("sha256").update(first.data).digest("hex")})
}
await writeFile(path.join(output,"repeat-proof.json"),JSON.stringify({nativeLaunches:2,scope:"Installation controls at declared labels, sizes and background; browser scope separately mapped",cases},null,2))
console.log("Independent installation native repeat proof: "+cases.length+" captures identical")

