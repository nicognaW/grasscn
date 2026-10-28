// Input: unchanged PNGs and font/include/default.json extracted from the supplied game JAR.
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import { PNG } from "pngjs"

const input = process.argv[2]
if (!input) throw new Error("Usage: node scripts/generate-assets.mjs <extracted-asset-directory>")
const atlasBytes = await readFile(path.join(input, "ascii.png"))
const atlas = PNG.sync.read(atlasBytes)
const definitions = JSON.parse(await readFile(path.join(input, "default.json"), "utf8"))
const provider = definitions.providers.find(p => p.file === "minecraft:font/ascii.png")
const cell = atlas.width / 16
const glyphs = []
for (let code = 32; code <= 126; code++) {
  const char = String.fromCharCode(code)
  const row = provider.chars.findIndex(line => line.includes(char))
  const column = provider.chars[row].indexOf(char)
  const ink = (x, y) => atlas.data[((row * cell + y) * atlas.width + column * cell + x) * 4 + 3] !== 0
  let rightmost = -1
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      if (!ink(x, y)) continue
      while (x + 1 < cell && ink(x + 1, y)) x++
      rightmost = Math.max(rightmost, x)
    }
  }
  glyphs.push([column * cell, row * cell, code === 32 ? 4 : rightmost + 2])
}
await writeFile("registry/ui/minecraft-font.ts", `// Original ASCII bitmap glyph [x, y, advance] metrics, code points 32..126.\nexport const minecraftGlyphs = ${JSON.stringify(glyphs)} as const\n`)
const sources = { "ascii.png": createHash("sha256").update(atlasBytes).digest("hex") }
let css = `/* Generated from Minecraft Java 26.2 assets. Original artwork remains Mojang's; local pilot only. */\n`
css += `.mc-button { --mc-ascii-atlas: url("data:image/png;base64,${atlasBytes.toString("base64")}"); --mc-atlas-size: ${atlas.width}; }\n`

for (const [state, filename] of [["normal", "button.png"], ["highlighted", "button_highlighted.png"], ["disabled", "button_disabled.png"]]) {
  const bytes = await readFile(path.join(input, filename))
  const sprite = PNG.sync.read(bytes)
  if (sprite.width !== 200 || sprite.height !== 20) throw new Error("Expected the pinned 200x20 sprite")
  sources[filename] = createHash("sha256").update(bytes).digest("hex")
  const metadata = await readFile(path.join(input, filename + ".mcmeta"))
  sources[filename + ".mcmeta"] = createHash("sha256").update(metadata).digest("hex")
  const b = JSON.parse(metadata).gui.scaling.border
  const w = 200 - b * 2, h = 20 - b * 2
  const pieces = [[0,0,b,b],[b,0,w,b],[200-b,0,b,b],
    [0,b,b,h],[b,b,w,h],[200-b,b,b,h],
    [0,20-b,b,b],[b,20-b,w,b],[200-b,20-b,b,b]]
  css += `.mc-button { --mc-${state}-border: ${b}; ${pieces.map(([x,y,width,height], i) => {
    const tile = new PNG({ width, height })
    PNG.bitblt(sprite, tile, x, y, width, height, 0, 0)
    return `--mc-${state}-${i}: url("data:image/png;base64,${PNG.sync.write(tile).toString("base64")}");`
  }).join(" ")} }\n`
}
await writeFile("registry/ui/minecraft-assets.css", css)
await writeFile("tests/reference/asset-provenance.json", JSON.stringify({ minecraftVersion: "26.2", sourceFiles: sources,
  font: "Unchanged original ASCII bitmap atlas; original advances preserved, space advance 4 from Minecraft space provider", sourceJarSha256: "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290" }, null, 2) + "\n")
console.log("Generated embedded textures and original ASCII bitmap glyph metrics")
