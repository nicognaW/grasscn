import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
const directory = process.argv[2]
if (!directory) throw new Error("Pass the original scroller PNG and metadata directory")
const inventory = JSON.parse(await readFile("tests/reference/catalog/native-inventory.json")), assets = {}, sources = {}
const hash = data => createHash("sha256").update(data).digest("hex")
for (const name of ["scroller", "scroller_background"]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`
  const bytes = await readFile(path.join(directory, `${name}.png`)), metadata = await readFile(path.join(directory, `${name}.png.mcmeta`))
  if (hash(bytes) !== inventory.assets[member].sha256 || hash(metadata) !== inventory.assets[member].metadataSha256) throw new Error(`Original scrollbar changed: ${name}`)
  assets[name] = `data:image/png;base64,${bytes.toString("base64")}`
  sources[member] = { sha256: hash(bytes), metadataSha256: hash(metadata), scaling: JSON.parse(metadata).gui.scaling }
}
await writeFile("registry/ui/minecraft-textarea-assets.ts", `// Original Minecraft Java 26.2 scroller artwork: Mojang Studios. Unchanged PNG bytes.\nexport const minecraftTextareaAssets = ${JSON.stringify(assets)} as const\n`)
const font = JSON.parse(await readFile("tests/reference/input-cjk/asset-provenance.json"))
const glyphAtlas = await readFile("tests/reference/input-cjk/glyph-atlas.json")
for (const directory of ["textarea", "textarea-cjk"]) {
  await writeFile(`tests/reference/${directory}/glyph-atlas.json`, glyphAtlas)
  await writeFile(`tests/reference/${directory}/asset-provenance.json`, JSON.stringify({ sourceJarSha256: inventory.jarSha256, sources: { ...sources, ...font.sources }, glyphAtlasSha256: font.glyphAtlasSha256, glyphProbeSourceSha256: font.glyphProbeSourceSha256, rendering: "Original text_field normal/highlighted textures are shared with Input. Original scroller/background use their own 6x32 border-1 nine-slice metadata. Native inner padding4, line height9, text E0E0E0 with shadow, cursor D0D0D0. CJK cases use original indexed Unihex pixels and observed native glyph UVs; other glyph sampling is unverified." }, null, 2) + "\n")
}
