import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
const input = process.argv[2]
if (!input) throw new Error("Pass the original text-field PNG/metadata and ASCII atlas directory")
const inventory = JSON.parse(await readFile(resolveRepositoryPath("tests/reference/catalog/native-inventory.json"), "utf8"))
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
const assets = {}, provenance = {}
for (const [key, file, member] of [
  ["normal", "text_field.png", "assets/minecraft/textures/gui/sprites/widget/text_field.png"],
  ["highlighted", "text_field_highlighted.png", "assets/minecraft/textures/gui/sprites/widget/text_field_highlighted.png"],
  ["atlas", "ascii.png", "assets/minecraft/textures/font/ascii.png"],
]) {
  const bytes = await readFile(path.join(input, file))
  if (hash(bytes) !== inventory.assets[member].sha256) throw new Error(`Original source changed: ${member}`)
  assets[key] = `data:image/png;base64,${bytes.toString("base64")}`
  provenance[member] = { sha256: hash(bytes), embeddedBytes: "unchanged" }
  if (key !== "atlas") {
    const metadata = await readFile(path.join(input, file + ".mcmeta"))
    if (hash(metadata) !== inventory.assets[member].metadataSha256) throw new Error(`Metadata changed: ${member}`)
    provenance[member].scaling = JSON.parse(metadata).gui.scaling
    provenance[member].metadataSha256 = hash(metadata)
  }
}
await writeFile(resolveRepositoryPath("registry/ui/minecraft-input-assets.ts"), `// Original Minecraft Java 26.2 artwork: Mojang Studios. PNG bytes embedded unchanged.\nexport const minecraftInputAssets = ${JSON.stringify(assets)} as const\n`)
await writeFile(resolveRepositoryPath("tests/reference/input/asset-provenance.json"), JSON.stringify({ sourceJarSha256: inventory.jarSha256, assets: provenance, rendering: "Software raster from original textures and glyph alpha; expected pixels come independently from the original EditBox GPU renderer." }, null, 2) + "\n")
