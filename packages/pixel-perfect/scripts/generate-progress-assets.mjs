import {resolveRepositoryPath} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import { PNG } from "pngjs"

const directory = process.argv[2]
if (!directory) throw new Error("Pass the original boss-bar PNG directory")
const inventory = JSON.parse(await readFile(resolveRepositoryPath("tests/reference/catalog/native-inventory.json"), "utf8"))
const sources = {}, assets = {}, rgba = {}
for (const [member, pin] of Object.entries(inventory.assets).filter(([member]) => member.includes("/sprites/boss_bar/"))) {
  const filename = path.basename(member), bytes = await readFile(path.join(directory, filename))
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  assert.equal(sha256, pin.sha256)
  const decoded = PNG.sync.read(bytes)
  sources[member] = { sha256, width: pin.width, height: pin.height, decodedRgbaSha256: createHash("sha256").update(decoded.data).digest("hex") }
  assets[filename.slice(0, -4)] = `data:image/png;base64,${bytes.toString("base64")}`
  rgba[filename.slice(0, -4)] = decoded.data.toString("base64")
}
assert.equal(Object.keys(assets).length, 22)
await writeFile(resolveRepositoryPath("registry/ui/minecraft-progress-assets.ts"), "// Original Minecraft boss-bar artwork: Mojang Studios. Unchanged PNG bytes and losslessly decoded original RGBA.\nexport const minecraftProgressAssets = " + JSON.stringify(assets) + " as const\nexport const minecraftProgressRgba = " + JSON.stringify(rgba) + " as const\n")
await writeFile(resolveRepositoryPath("tests/reference/progress/asset-provenance.json"), JSON.stringify({ sourceJarSha256: inventory.jarSha256, sources, rendering: "Original BossHealthOverlay.extractBar with fixed LerpingBossEvent initial/current/target progress; no time-varying interpolation. Native182x5 dimensions. Paint color background then notch background, then cropped color progress and cropped notch progress. All22 original PNGs and losslessly decoded RGBA retained. Translucent notch pixels are uploaded as original unpremultiplied RGBA and composited with native source-alpha blending in a shared offscreen WebGL painter. Output preserves transparent original corners without flattening an external backdrop. Fill is Mth.lerpDiscrete(floatProgress,0,182): floor(float(floatProgress*181)) plus1 for positive progress. Web maximum/value semantics remain Radix; unknown progress uses the native empty surface without animation. Arbitrary resizing and other raster environments remain unverified." }, null, 2) + "\n")
