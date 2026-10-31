import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"

const directory = process.argv[2]
if (!directory) throw new Error("Pass the original separator PNG directory")
const inventory = JSON.parse(await readFile("tests/reference/catalog/native-inventory.json", "utf8"))
const sources = {}, assets = {}
for (const prefix of ["", "inworld_"]) for (const edge of ["header", "footer"]) {
  const filename = `${prefix}${edge}_separator.png`
  const member = `assets/minecraft/textures/gui/${filename}`
  const bytes = await readFile(path.join(directory, filename))
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  assert.equal(sha256, inventory.assets[member].sha256)
  sources[member] = { sha256, width: 32, height: 2 }
  if (!prefix) assets[edge] = `data:image/png;base64,${bytes.toString("base64")}`
  else assert.equal(sha256, sources[`assets/minecraft/textures/gui/${edge}_separator.png`].sha256)
}
await writeFile("registry/ui/minecraft-separator-assets.ts", "// Original Minecraft Java 26.2 separator artwork: Mojang Studios. Unchanged PNG bytes.\nexport const minecraftSeparatorAssets = " + JSON.stringify(assets) + " as const\n")
await writeFile("tests/reference/separator/asset-provenance.json", JSON.stringify({ sourceJarSha256: inventory.jarSha256, sources, rendering: "Original AbstractSelectionList.extractListSeparators: GUI_TEXTURED blit, u=v=0, texture32x2, drawn at native width and height2 with repeating U coordinates. Header at list.y-2; footer at list.bottom. Native runtime captures use the original method on an isolated empty list with no loaded world. In-world assets are byte-identical; world lifecycle is not exercised. Vertical orientation has no native reference and is omitted." }, null, 2) + "\n")
