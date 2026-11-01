import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { toastGlyphAtlas } from "./minecraft-toast-atlas";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

export type ToastGlyph = {
  code: number;
  pixels: Uint8Array;
  width: number;
  height: number;
  advance: number;
};
let source: Promise<Uint8ClampedArray> | undefined;
function alpha() {
  return (source ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      resolve(context.getImageData(0, 0, 128, 128).data);
    };
    image.onerror = reject;
    image.src = minecraftInputAssets.atlas;
  }));
}
export async function toastLayout(title: string, message: string | null) {
  const [, bitmap] = await Promise.all([loadUnihex(), alpha()]),
    cache = new Map<string, ToastGlyph>();
  let supported = true;
  const glyph = (char: string) => {
    let result = cache.get(char);
    if (result) return result;
    const code = char.codePointAt(0)!,
      ascii = minecraftGlyphs[code - 32],
      uni = getUnihexGlyph(char),
      observed = toastGlyphAtlas[code.toString(16)];
    const width = observed
        ? Math.round((observed.u1 - observed.u0) * 256 + 0.02)
        : ascii
          ? 8
          : (uni?.width ?? 0),
      height = ascii ? 8 : 16,
      pixels = new Uint8Array(width * height * 4);
    if (!ascii && !uni && char !== " ") supported = false;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const on = ascii
          ? bitmap[((ascii[1] + y) * 128 + ascii[0] + x) * 4 + 3]
          : uni
            ? ((uni.rows[y] >>> (uni.bitWidth - 1 - x - uni.left)) & 1) * 255
            : 0;
        pixels.set([255, 255, 255, on], (y * width + x) * 4);
      }
    result = {
      code,
      pixels,
      width,
      height,
      advance: observed?.advance ?? ascii?.[2] ?? uni?.advance ?? 0,
    };
    cache.set(char, result);
    return result;
  };
  const advance = (char: string) => glyph(char).advance;
  const wrap = (text: string | null) => {
    if (text == null || text === "") return [] as string[];
    const lines: string[] = [];
    for (let remaining of text.split("\n")) {
      while (
        Array.from(remaining).reduce((n, char) => n + advance(char), 0) > 200
      ) {
        const chars = Array.from(remaining);
        let used = 0,
          count = 0,
          space = -1;
        while (count < chars.length) {
          if (chars[count] === " ") space = count;
          if (used + advance(chars[count]) > 200 && count > 0) break;
          used += advance(chars[count++]);
        }
        const end = space < 0 ? Math.max(1, count) : space;
        lines.push(chars.slice(0, end).join(""));
        remaining = chars.slice(end + Number(space >= 0)).join("");
      }
      lines.push(remaining);
    }
    return lines;
  };
  const titleLines = wrap(title),
    messageLines = wrap(message),
    all = [...titleLines, ...messageLines];
  const width =
    Math.max(
      160,
      all.length
        ? Math.max(
            ...all.map((line) =>
              Math.ceil(
                Array.from(line).reduce((n, char) => n + advance(char), 0)
              )
            )
          )
        : 200
    ) + 30;
  const height =
    20 + (titleLines.length - 1) * 12 + Math.max(1, messageLines.length) * 12;
  return {
    width,
    height,
    title: titleLines.map((line) => Array.from(line, glyph)),
    message: messageLines.map((line) => Array.from(line, glyph)),
    supported,
    titleLines,
    messageLines,
  };
}
