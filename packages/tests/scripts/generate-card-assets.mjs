import {resolveRepositoryPath} from '../../../workspace-paths.mjs'
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
import path from "node:path"
const input = process.argv[2]
if (!input) throw new Error("Pass the original popup background PNG and metadata directory")
const inventory = JSON.parse(await readFile(resolveRepositoryPath("tests/reference/catalog/native-inventory.json"), "utf8"))
const member = "assets/minecraft/textures/gui/sprites/popup/background.png"
const bytes = await readFile(path.join(input, "background.png")), metadata = await readFile(path.join(input, "background.png.mcmeta"))
const hash = data => createHash("sha256").update(data).digest("hex")
if (hash(bytes) !== inventory.assets[member].sha256 || hash(metadata) !== inventory.assets[member].metadataSha256) throw new Error("Original popup asset changed")
const image = PNG.sync.read(bytes), scaling = JSON.parse(metadata).gui.scaling, border = scaling.border
const widths = [border, image.width - border * 2, border], heights = [border, image.height - border * 2, border]
const uri = bytes => `url("data:image/png;base64,${bytes.toString("base64")}")`, pieces = []
for (let row = 0, y = 0; row < 3; y += heights[row++]) for (let col = 0, x = 0; col < 3; x += widths[col++]) {
  const piece = new PNG({ width: widths[col], height: heights[row] })
  PNG.bitblt(image, piece, x, y, piece.width, piece.height, 0, 0)
  pieces.push(uri(PNG.sync.write(piece)))
}
await writeFile(resolveRepositoryPath("registry/ui/minecraft-card-sprite.ts"), `// Original Minecraft Java 26.2 popup artwork: Mojang Studios. Pieces are exact PNG crops.\nexport const minecraftCardSprite = ${JSON.stringify({ width: image.width, height: image.height, border: { left: border, top: border, right: border, bottom: border }, stretch: scaling.stretch_inner ?? false, image: uri(bytes), pieces })} as const\n`)
await writeFile(resolveRepositoryPath("tests/reference/card/asset-provenance.json"), JSON.stringify({ sourceJarSha256: inventory.jarSha256, member, sha256: hash(bytes), metadataSha256: hash(metadata), scaling, sourceMethod: "PopupScreen.extractBackground; GuiGraphicsExtractor.blitSprite", scope: "Native popup panel surface only. Card section layout is a web composition, not an independent vanilla screen." }, null, 2) + "\n")
