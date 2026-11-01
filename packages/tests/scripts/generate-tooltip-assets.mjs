import {resolveRepositoryPath} from '../../../workspace-paths.mjs'
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
const input = process.argv[2]
if (!input) throw new Error("Pass the original tooltip background/frame PNG and metadata directory")
const inventory = JSON.parse(await readFile(resolveRepositoryPath("tests/reference/catalog/native-inventory.json"), "utf8"))
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
const sprites = {}, sources = {}
const placementBytes = await readFile(resolveRepositoryPath("tests/reference/tooltip/atlas-placement.json"))
const placement = JSON.parse(placementBytes)
const locations = {}
let atlasWidth, atlasHeight
for (const name of ["background", "frame"]) {
  const member = `assets/minecraft/textures/gui/sprites/tooltip/${name}.png`
  const bytes = await readFile(path.join(input, `${name}.png`)), metadata = await readFile(path.join(input, `${name}.png.mcmeta`))
  if (hash(bytes) !== inventory.assets[member].sha256 || hash(metadata) !== inventory.assets[member].metadataSha256) throw new Error(`Original asset changed: ${member}`)
  const image = PNG.sync.read(bytes), scaling = JSON.parse(metadata).gui.scaling, b = scaling.border
  const native = Object.entries(placement).find(([key]) => key.includes(`texture=minecraft:tooltip/${name}]`))?.[1]
  if (!native) throw new Error(`Native atlas location missing: ${name}`)
  const aw = Math.round(image.width / (native.u1 - native.u0)), ah = Math.round(image.height / (native.v1 - native.v0))
  if (atlasWidth && (aw !== atlasWidth || ah !== atlasHeight)) throw new Error("Tooltip sprites use different atlases")
  atlasWidth = aw; atlasHeight = ah
  locations[name] = { x: Math.round(native.u0 * aw), y: Math.round(native.v0 * ah) }
  const widths = [b, image.width - 2 * b, b], heights = [b, image.height - 2 * b, b]
  const uri = data => `url("data:image/png;base64,${data.toString("base64")}")`
  const pieces = []
  for (let row = 0, y = 0; row < 3; y += heights[row++]) for (let col = 0, x = 0; col < 3; x += widths[col++]) {
    const tile = new PNG({ width: widths[col], height: heights[row] })
    PNG.bitblt(image, tile, x, y, tile.width, tile.height, 0, 0)
    pieces.push(uri(PNG.sync.write(tile)))
  }
  sprites[name] = { width: image.width, height: image.height, border: { left: b, top: b, right: b, bottom: b }, stretch: scaling.stretch_inner ?? false, image: uri(bytes), rgba: image.data.toString("base64"), pieces }
  sources[member] = { sha256: hash(bytes), metadataSha256: hash(metadata), scaling }
}
await writeFile(resolveRepositoryPath("registry/ui/minecraft-tooltip-sprites.ts"), `// Original Minecraft artwork: Mojang Studios. Pieces are exact crops of original PNGs.\nexport const minecraftTooltipSprites = ${JSON.stringify(sprites)} as const\nexport const minecraftTooltipAtlas = ${JSON.stringify({ width: atlasWidth, height: atlasHeight, locations })} as const\n`)
await writeFile(resolveRepositoryPath("tests/reference/tooltip/asset-provenance.json"), JSON.stringify({ sourceJarSha256: inventory.jarSha256, sources, atlasPlacementSha256: hash(placementBytes), atlasProbeSourceSha256: hash(await readFile(resolveRepositoryPath("tests/reference/AtlasProbeMain.java"))), rendering: "Original background/frame with separate nine-slice metadata, native runtime atlas coordinates and source-alpha GPU blending; original ASCII glyph metrics and masks. Exact pixels depend on viewport and screen position. Solid CSS backdrops are composited; image/gradient backdrops retain original CSS surfaces without exact compositing proof." }, null, 2) + "\n")
