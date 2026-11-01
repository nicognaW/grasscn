import { minecraftGlyphs } from "./minecraft-font"
import { getUnihexGlyph } from "./minecraft-unifont"

const advance = (char: string) => minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ?? getUnihexGlyph(char)?.advance ?? 6
export const hoverCardTextWidth = (text: string) => Math.ceil(Array.from(text).reduce((width, char) => width + advance(char), 0))
export const hoverCardTextSupported = (text: string) => Array.from(text).every(char => /^[\x20-\x7e\n]$/.test(char) || getUnihexGlyph(char))

export function wrapHoverCard(text: string, maximum: number) {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    let remaining = Array.from(paragraph)
    while (remaining.length && hoverCardTextWidth(remaining.join("")) > maximum) {
      let count = 0, width = 0, space = -1
      while (count < remaining.length) {
        if (remaining[count] === " ") space = count
        const next = advance(remaining[count])
        if (width + next > maximum && count > 0) break
        width += next
        count++
      }
      const end = space >= 0 ? space : Math.max(1, count)
      lines.push(remaining.slice(0, end).join(""))
      remaining = remaining.slice(end + Number(space >= 0))
    }
    lines.push(remaining.join(""))
  }
  return lines
}
