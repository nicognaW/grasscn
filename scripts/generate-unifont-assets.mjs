import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import opentype from "opentype.js"
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
// Remove OpenType's wall-clock timestamps and repair the standard checksums.
function stableFont(buffer) {
  const bytes = Buffer.from(buffer)
  let record = 12
  while (record < 12 + bytes.readUInt16BE(4) * 16 && bytes.toString("ascii", record, record + 4) !== "head") record += 16
  if (record >= 12 + bytes.readUInt16BE(4) * 16) throw new Error("Metric font has no head table")
  const offset = bytes.readUInt32BE(record + 8), length = bytes.readUInt32BE(record + 12)
  for (const position of [20, 28]) bytes.writeBigUInt64BE(2082844800n, offset + position)
  bytes.writeUInt32BE(0, offset + 8)
  const sum = (start, length) => {
    let result = 0
    for (let i = 0; i < length; i += 4) { let word = 0; for (let j = 0; j < 4; j++) word = (word << 8) | (i + j < length ? bytes[start + i + j] : 0); result = (result + (word >>> 0)) >>> 0 }
    return result
  }
  bytes.writeUInt32BE(sum(offset, length), record + 4)
  bytes.writeUInt32BE((0xb1b0afba - sum(0, bytes.length)) >>> 0, offset + 8)
  return bytes
}
const directory = process.argv[2]
if (!directory) throw new Error("Pass the extracted indexed Unifont ZIP, HEX, provider definition and provenance directory")
const zip = await readFile(path.join(directory, "unifont.zip"))
const providers = JSON.parse(await readFile(path.join(directory, "unifont.json"), "utf8"))
const provenance = JSON.parse(await readFile(path.join(directory, "provenance.json"), "utf8"))
if (createHash("sha256").update(zip).digest("hex") !== provenance["minecraft/font/unifont.zip"].sha256) throw new Error("Indexed Unifont ZIP digest changed")
const overrides = providers.providers.find(provider => provider.hex_file === "minecraft:font/unifont.zip").size_overrides.map(range => [range.from.codePointAt(0), range.to.codePointAt(0), range.left, range.right])
const isCJK = code => (code >= 0x1100 && code <= 0x11ff) || (code >= 0x2e80 && code <= 0x9fff) || (code >= 0xa960 && code <= 0xa97f) || (code >= 0xac00 && code <= 0xd7ff) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xff01 && code <= 0xffef) || (code >= 0x1aff0 && code <= 0x1b2ff) || (code >= 0x20000 && code <= 0x323af)
const groups = new Map()
let count = 0
for (const line of (await readFile(path.join(directory, "unifont.hex"), "utf8")).split("\n")) {
  const [raw, hex] = line.trim().split(":")
  if (!hex) continue
  const code = parseInt(raw, 16)
  if (!isCJK(code)) continue
  const bitWidth = hex.length / 4, rowLength = hex.length / 16
  const rows = Array.from({ length: 16 }, (_, row) => parseInt(hex.slice(row * rowLength, (row + 1) * rowLength), 16))
  let left = bitWidth, right = -1
  for (let x = 0; x < bitWidth; x++) if (rows.some(row => (row >>> (bitWidth - 1 - x)) & 1)) { left = Math.min(left, x); right = Math.max(right, x) }
  if (right < 0) { left = 0; right = bitWidth }
  const fixed = overrides.find(range => code >= range[0] && code <= range[1])
  if (fixed) { left = fixed[2]; right = fixed[3] }
  const plane = Math.floor(code / 65536)
  if (!groups.has(plane)) groups.set(plane, [])
  groups.get(plane).push(new opentype.Glyph({ name: `uni${raw}`, unicode: code, advanceWidth: ((right - left + 1) / 2 + 1) * 128, path: new opentype.Path() }))
  count++
}
let css = "/* Advance-only font for hidden native input text. Visible glyphs use original Unihex pixels. */\n"
for (const [plane, glyphs] of groups) {
  if (glyphs.length >= 65535) throw new Error("Unihex metric font plane exceeds OpenType glyph limit")
  const font = new opentype.Font({ familyName: "Minecraft Unihex Metrics 26.2", styleName: "Regular", unitsPerEm: 1024, ascender: 896, descender: -128,
    glyphs: [new opentype.Glyph({ name: ".notdef", advanceWidth: 768, path: new opentype.Path() }), ...glyphs] })
  css += `@font-face { font-family: "Minecraft Unihex Metrics 26.2"; src: url("data:font/otf;base64,${stableFont(font.toArrayBuffer()).toString("base64")}") format("opentype"); font-weight: 400; font-style: normal; font-display: block; unicode-range: U+${(plane * 65536).toString(16)}-${(plane * 65536 + 65535).toString(16)}; }\n`
}
await writeFile("registry/ui/minecraft-unifont-metrics.css", css)
await writeFile("registry/ui/minecraft-unifont-data.ts", `// Unchanged Minecraft indexed GNU Unifont ZIP, including its original license.\nexport const unifontZip = ${JSON.stringify(zip.toString("base64"))}\nexport const unifontOverrides = ${JSON.stringify(overrides)} as const\n`)
const atlasBytes = await readFile("tests/reference/input-cjk/glyph-atlas.json")
const atlas = JSON.parse(atlasBytes)
await writeFile("registry/ui/minecraft-unifont-atlas.ts", `// Observed Java 26.2 default-font UVs; original glyph pixels remain in the indexed Unihex archive.\nexport const nativeUnihexAtlas: Record<string, {u0:number;u1:number;v0:number;v1:number}> = ${JSON.stringify(Object.fromEntries(Object.entries(atlas).map(([code, glyph]) => [code, { u0: glyph.u0, u1: glyph.u1, v0: glyph.v0, v1: glyph.v1 }])))}\n`)
await writeFile("tests/reference/input-cjk/asset-provenance.json", JSON.stringify({ assetIndex: "32", locale: "en_us / Japanese glyph filter disabled", sources: provenance, glyphCount: count, glyphAtlasSha256: hash(atlasBytes), glyphProbeSourceSha256: hash(await readFile("tests/reference/GlyphProbeMain.java")), rendering: "Original indexed Unihex pixels and size overrides; oversample2, shadow offset0.5, native 0.01-texel inset and observed default-font UVs for the tested glyphs. GPU projection uses the actual input screen position and viewport. Advance-only font preserves native DOM hit-testing. Other CJK glyphs retain original pixels but their atlas sampling is unverified." }, null, 2) + "\n")
console.log(`Prepared ${count} CJK glyph metrics in ${groups.size} Unicode planes; original font ZIP preserved`)
