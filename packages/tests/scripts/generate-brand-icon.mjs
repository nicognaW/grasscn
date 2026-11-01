import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import { readFile, writeFile, mkdir, cp } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import { PNG } from "pngjs"
import { minecraftGlyphs } from "../../../apps/web/registry/ui/minecraft-font.ts"
import { minecraftInputAssets } from "../../../apps/web/registry/ui/minecraft-input-assets.ts"
import { minecraftCardSprite } from "../../../apps/web/registry/ui/minecraft-card-sprite.ts"

const [first, second] = process.argv.slice(2)
if (!first || !second) throw new Error("Pass two independently captured native grass-item output directories")
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
const one = JSON.parse(await readFile(path.join(first, "capture.json"))), two = JSON.parse(await readFile(path.join(second, "capture.json")))
assert.deepEqual(one, two, "Native item capture identities differ")
const assets = resolveRepositoryPath("preview/assets"), references = resolveRepositoryPath("tests/reference/branding")
await Promise.all([mkdir(assets, { recursive: true }), mkdir(references, { recursive: true })])
const cases = [], generated = {}
for (const scale of one.scales) {
  const images = []
  for (const background of ["black", "white"]) {
    const filename = `grass-block-${background}-s${scale}.png`
    const a = await readFile(path.join(first, filename)), b = await readFile(path.join(second, filename))
    const p = PNG.sync.read(a), q = PNG.sync.read(b)
    assert.deepEqual([p.width, p.height], [16 * scale, 16 * scale])
    assert.ok(p.data.equals(q.data), `Non-repeatable native item: ${filename}`)
    images.push(p)
    cases.push({ filename, scale, background, firstPngSha256: hash(a), secondPngSha256: hash(b), decodedRgbaSha256: hash(p.data), mismatchedPixels: 0 })
  }
  const [black, white] = images, result = new PNG({ width: black.width, height: black.height })
  let opaque = 0
  for (let i = 0; i < black.data.length; i += 4) {
    const delta = [0, 1, 2].map(channel => white.data[i + channel] - black.data[i + channel])
    // Original grass-block geometry and textures are opaque; its untouched GUI
    // background is the only transparent region. No chroma-key colors are guessed.
    assert.ok(delta.every(value => value === 0) || delta.every(value => value === 255), "Native item has partial alpha; paired recovery needs a wider precision model")
    const alpha = delta[0] === 255 ? 0 : 255
    result.data.set(alpha ? [...black.data.subarray(i, i + 3), 255] : [0, 0, 0, 0], i)
    if (alpha) opaque++
  }
  assert.ok(opaque > 50 && opaque < result.width * result.height, "Grass item silhouette is missing")
  const bytes = PNG.sync.write(result), filename = `grass-block-${16 * scale}.png`
  await writeFile(path.join(assets, filename), bytes)
  generated[filename] = { width: result.width, height: result.height, sha256: hash(bytes), opaquePixels: opaque, alphaRecovery: "Exact per-pixel black/white contrast identifies binary coverage; original item RGB copied without recoloring or resizing" }
}

const block = `data:image/png;base64,${(await readFile(path.join(assets, "grass-block-48.png"))).toString("base64")}`
const atlas = minecraftInputAssets.atlas
const defs = [], shapes = []
const border = minecraftCardSprite.border.left
const widths = [border, minecraftCardSprite.width - border * 2, border], heights = [border, minecraftCardSprite.height - border * 2, border]
const destinationWidths = [border, 120 - border * 2, border], destinationHeights = [border, 40 - border * 2, border]
for (let row = 0, y = 12; row < 3; y += destinationHeights[row++]) for (let col = 0, x = 56; col < 3; x += destinationWidths[col++]) {
  const index = row * 3 + col, source = minecraftCardSprite.pieces[index].slice(5, -2)
  defs.push(`<pattern id="panel${index}" x="${x}" y="${y}" width="${widths[col]}" height="${heights[row]}" patternUnits="userSpaceOnUse"><image href="${source}" width="${widths[col]}" height="${heights[row]}"/></pattern>`)
  shapes.push(`<rect x="${x}" y="${y}" width="${destinationWidths[col]}" height="${destinationHeights[row]}" fill="url(#panel${index})"/>`)
}
let x = 68
for (const [index, char] of Array.from("grass cn").entries()) {
  const [gx, gy, advance] = minecraftGlyphs[char.charCodeAt(0) - 32], color = index > 5 ? "#55ff55" : "#ffffff", shadow = index > 5 ? "#153f15" : "#3f3f3f"
  if (char !== " ") for (const [pass, offset, ink] of [["shadow", 2, shadow], ["ink", 0, color]]) {
    const left = x + offset, top = 24 + offset, id = `glyph${index}${pass}`
    defs.push(`<mask id="${id}" maskUnits="userSpaceOnUse" x="${left}" y="${top}" width="${advance * 2}" height="16"><image href="${atlas}" x="${left - gx * 2}" y="${top - gy * 2}" width="256" height="256"/></mask>`)
    shapes.push(`<rect x="${left}" y="${top}" width="${advance * 2}" height="16" fill="${ink}" mask="url(#${id})"/>`)
  }
  x += advance * 2
}
const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="64" viewBox="0 0 176 64" role="img" aria-labelledby="title desc" style="image-rendering:pixelated" shape-rendering="crispEdges"><title id="title">grasscn</title><desc id="desc">Original Minecraft grass-block inventory item with a grass cn pixel-text badge.</desc><defs>${defs.join("")}</defs><image href="${block}" x="0" y="8" width="48" height="48"/>${shapes.join("")}</svg>\n`
await writeFile(path.join(assets, "grasscn-logo.svg"), logo)
generated["grasscn-logo.svg"] = { width: 176, height: 64, sha256: hash(Buffer.from(logo)), text: "grass cn", composition: "Native GUI-scale-3 grass item plus original popup nine-slice artwork and original ASCII bitmap glyphs; layout is an original project badge" }
await cp(first, path.join(references, "native-one"), { recursive: true })
await cp(second, path.join(references, "native-two"), { recursive: true })
const provenance = { project: "grasscn", minecraftVersion: "26.2", ...one, cases,
  sourceAssets: {
    block: JSON.parse(await readFile(resolveRepositoryPath("tests/reference/branding/model-assets.json"))),
    popup: JSON.parse(await readFile(resolveRepositoryPath("tests/reference/card/asset-provenance.json"))),
    asciiGlyphMetricsSha256: hash(await readFile(resolveRepositoryPath("registry/ui/minecraft-font.ts"))),
    asciiRasterSha256: hash(Buffer.from(atlas.split(",")[1], "base64")),
  }, generated }
await writeFile(resolveRepositoryPath("preview/branding.provenance.json"), JSON.stringify(provenance, null, 2) + "\n")
console.log("Prepared original native grass icons and grasscn bitmap badge; both native runs match exactly")
