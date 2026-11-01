import { paintUnihexGPU } from "./minecraft-unifont-gpu"
export type UnihexGlyph = { code: number; rows: number[]; bitWidth: number; left: number; width: number; advance: number }
let font: Map<number, UnihexGlyph> | undefined
let pending: Promise<void> | undefined
export const isCJKCodepoint = (code: number) => (code >= 0x1100 && code <= 0x11ff) || (code >= 0x2e80 && code <= 0x9fff) || (code >= 0xa960 && code <= 0xa97f) || (code >= 0xac00 && code <= 0xd7ff) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xff01 && code <= 0xffef) || (code >= 0x1aff0 && code <= 0x1b2ff) || (code >= 0x20000 && code <= 0x323af)
export const getUnihexGlyph = (char: string) => font?.get(char.codePointAt(0)!)
export function loadUnihex() {
  return pending ??= (async () => {
    const { unifontZip, unifontOverrides } = await import("./minecraft-unifont-data")
    const bytes = Uint8Array.from(atob(unifontZip), char => char.charCodeAt(0))
    const view = new DataView(bytes.buffer)
    let end = bytes.length - 22
    while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
    if (end < 0) throw new Error("Original Unihex ZIP directory missing")
    let position = view.getUint32(end + 16, true), contents = ""
    while (view.getUint32(position, true) === 0x02014b50) {
      const method = view.getUint16(position + 10, true), length = view.getUint32(position + 20, true)
      const nameLength = view.getUint16(position + 28, true), extra = view.getUint16(position + 30, true), comment = view.getUint16(position + 32, true)
      const name = new TextDecoder().decode(bytes.subarray(position + 46, position + 46 + nameLength))
      if (name.endsWith(".hex")) {
        if (method !== 8) throw new Error("Unexpected Unihex ZIP compression")
        const local = view.getUint32(position + 42, true)
        const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
        contents += await new Response(new Blob([bytes.slice(start, start + length)]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text()
      }
      position += 46 + nameLength + extra + comment
    }
    font = new Map()
    for (const line of contents.split("\n")) {
      const [raw, hex] = line.trim().split(":")
      if (!hex) continue
      const code = parseInt(raw, 16)
      if (!isCJKCodepoint(code)) continue
      const bitWidth = hex.length / 4, rowLength = hex.length / 16
      const rows = Array.from({ length: 16 }, (_, row) => parseInt(hex.slice(row * rowLength, (row + 1) * rowLength), 16))
      let left = bitWidth, right = -1
      for (let x = 0; x < bitWidth; x++) if (rows.some(row => (row >>> (bitWidth - 1 - x)) & 1)) { left = Math.min(left, x); right = Math.max(right, x) }
      if (right < 0) { left = 0; right = bitWidth }
      const fixed = unifontOverrides.find(range => code >= range[0] && code <= range[1])
      if (fixed) { left = fixed[2]; right = fixed[3] }
      const width = right - left + 1
      font.set(code, { code, rows, bitWidth, left, width, advance: width / 2 + 1 })
    }
  })()
}

export function paintUnihex(context: CanvasRenderingContext2D, glyph: UnihexGlyph, x: number, y: number, scale: number) {
  if (paintUnihexGPU(context, glyph, x, y, scale)) return
  const left = x * scale, top = y * scale, width = glyph.width / 2 * scale, height = 8 * scale
  for (let py = Math.floor(top + .5); py < Math.floor(top + height + .5); py++) {
    const sy = Math.max(0, Math.min(15, Math.floor(.01 + ((py + .5 - top) / height) * 15.98 - 1e-6)))
    for (let px = Math.ceil(left - .5); px < Math.ceil(left + width - .5); px++) {
      const sx = Math.floor(.01 + ((px + .5 - left) / width) * (glyph.width - .02) - 1e-6) + glyph.left
      if (sx >= 0 && sx < glyph.bitWidth && ((glyph.rows[sy] >>> (glyph.bitWidth - 1 - sx)) & 1)) context.fillRect(px, py, 1, 1)
    }
  }
}
