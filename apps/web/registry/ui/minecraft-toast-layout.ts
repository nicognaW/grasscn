import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { toastGlyphAtlas } from "./minecraft-toast-atlas";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

const observedToastGlyphs: Partial<typeof toastGlyphAtlas> = toastGlyphAtlas;

export interface ToastGlyph {
  code: number;
  pixels: Uint8Array;
  width: number;
  height: number;
  advance: number;
}

let source: Promise<Uint8ClampedArray> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached image Promise itself, including rejection; async would wrap its identity.
const alpha = function alpha() {
  // oxlint-disable-next-line promise/avoid-new -- Preserve the cached Image load/error bridge and its onload alpha-extraction phase.
  return (source ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      canvas.height = 128;
      canvas.width = 128;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(
          new Error(
            "Minecraft toast layout 2D canvas context could not be created"
          )
        );

        return;
      }

      context.drawImage(image, 0, 0);
      resolve(context.getImageData(0, 0, 128, 128).data);
    });

    image.addEventListener("error", reject);
    image.src = minecraftInputAssets.atlas;
  }));
};

export const toastLayout = async function toastLayout(
  title: string,
  message: string | null
) {
  const [, bitmap] = await Promise.all([loadUnihex(), alpha()]);
  const cache = new Map<string, ToastGlyph>();

  let supported = true;

  const glyph = (char: string) => {
    let result = cache.get(char);

    if (result) {
      return result;
    }

    const code =
      // SAFETY: Private glyph callers supply nonempty iteration characters or guarded in-bounds code units. Its first code point therefore exists.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The verified glyph-character producer proves this specific codePointAt(0) result.
      char.codePointAt(0) as number;

    const ascii = asciiGlyphs[code - 32];
    const uni = getUnihexGlyph(char);
    const observed = observedToastGlyphs[code.toString(16)];

    let selectedWidth: number;

    if (observed) {
      selectedWidth = Math.round((observed.u1 - observed.u0) * 256 + 0.02);
    } else if (ascii) {
      selectedWidth = 8;
    } else {
      selectedWidth = uni?.width ?? 0;
    }

    const width = selectedWidth;

    const height = ascii ? 8 : 16;
    const pixels = new Uint8Array(width * height * 4);

    if (!ascii && !uni && char !== " ") {
      supported = false;
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let selectedOn: number;

        if (ascii) {
          selectedOn = bitmap[((ascii[1] + y) * 128 + ascii[0] + x) * 4 + 3];
        } else if (uni) {
          selectedOn =
            // oxlint-disable-next-line no-bitwise -- Unihex rows store one bit per glyph column; extract the selected column bit.
            ((uni.rows[y] >>> (uni.bitWidth - 1 - x - uni.left)) & 1) * 255;
        } else {
          selectedOn = 0;
        }

        const on = selectedOn;

        pixels.set([255, 255, 255, on], (y * width + x) * 4);
      }
    }

    result = {
      advance: observed?.advance ?? ascii?.[2] ?? uni?.advance ?? 0,
      code,
      height,
      pixels,
      width,
    };
    cache.set(char, result);

    return result;
  };

  const advance = (char: string) => glyph(char).advance;

  const wrap = (text: string | null) => {
    if (text === null || text === undefined || text === "") {
      return [] as string[];
    }

    const lines: string[] = [];

    for (let remaining of text.split("\n")) {
      const toastLineAdvance = function toastLineAdvance(glyphText: string) {
        let accumulatedGlyphAdvance = 0;

        for (const advanceCharacter of glyphText) {
          accumulatedGlyphAdvance += advance(advanceCharacter);
        }

        return accumulatedGlyphAdvance;
      };

      while (toastLineAdvance(remaining) > 200) {
        const chars: string[] = [];

        for (const bufferCharacter of remaining) {
          chars.push(bufferCharacter);
        }

        let count = 0;
        let used = 0;
        let space = -1;

        while (count < chars.length) {
          if (chars[count] === " ") {
            space = count;
          }

          if (used + advance(chars[count]) > 200 && count > 0) {
            break;
          }

          const currentCharacter = chars[count];
          count += 1;
          used += advance(currentCharacter);
        }

        const end = space < 0 ? Math.max(1, count) : space;
        lines.push(chars.slice(0, end).join(""));
        remaining = chars.slice(end + Number(space >= 0)).join("");
      }

      lines.push(remaining);
    }

    return lines;
  };

  const titleLines = wrap(title);
  const messageLines = wrap(message);
  const all = [...titleLines, ...messageLines];

  const width =
    Math.max(
      160,
      all.length
        ? Math.max(
            ...all.map((line) => {
              let accumulatedGlyphAdvance2 = 0;

              for (const advanceCharacter2 of line) {
                accumulatedGlyphAdvance2 += advance(advanceCharacter2);
              }

              return Math.ceil(accumulatedGlyphAdvance2);
            })
          )
        : 200
    ) + 30;

  const height =
    20 + (titleLines.length - 1) * 12 + Math.max(1, messageLines.length) * 12;

  return {
    height,
    message: messageLines.map((line) => Array.from(line, glyph)),
    messageLines,
    supported,
    title: titleLines.map((line) => Array.from(line, glyph)),
    titleLines,
    width,
  };
};
