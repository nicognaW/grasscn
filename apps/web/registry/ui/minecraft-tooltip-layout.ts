import { minecraftGlyphs } from "./minecraft-font";
export const minecraftTextWidth = (text: string) =>
  Array.from(text).reduce(
    (sum, char) => sum + (minecraftGlyphs[char.charCodeAt(0) - 32]?.[2] ?? 6),
    0
  );

export function wrapMinecraftTooltip(text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let remaining = paragraph;
    while (remaining.length && minecraftTextWidth(remaining) > maxWidth) {
      let count = 0,
        width = 0,
        lastSpace = -1;
      while (count < remaining.length) {
        const next = minecraftTextWidth(remaining[count]);
        if (remaining[count] === " ") lastSpace = count;
        if (width + next > maxWidth && count > 0) break;
        width += next;
        count++;
      }
      if (lastSpace >= 0) {
        lines.push(remaining.slice(0, lastSpace));
        remaining = remaining.slice(lastSpace + 1);
      } else {
        lines.push(remaining.slice(0, Math.max(1, count)));
        remaining = remaining.slice(Math.max(1, count));
      }
    }
    lines.push(remaining);
  }
  return lines;
}
