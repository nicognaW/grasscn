import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import {
  getUnihexGlyph,
  isCJKCodepoint,
  loadUnihex,
  paintUnihex,
} from "./minecraft-unifont";
import { positionUnihex, disposeUnihex } from "./minecraft-unifont-gpu";

interface Images {
  normal: HTMLImageElement;
  highlighted: HTMLImageElement;
  alpha: Uint8ClampedArray;
}

let images: Promise<Images> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached image Promise itself, including rejection; async would wrap its identity.
const loadImages = function loadImages() {
  return (images ??= Promise.all(
    Object.values(minecraftInputAssets).map(
      (src) =>
        // oxlint-disable-next-line promise/avoid-new -- Preserve the cached texture-load event bridge and its existing custom load Error.
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            resolve(image);
          };

          image.onerror = () => {
            reject(new Error("Embedded Minecraft Input image could not load"));
          };

          image.src = src;
        })
    )
  ).then(([normal, highlighted, atlas]) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.drawImage(atlas, 0, 0);

    return {
      alpha: context.getImageData(0, 0, 128, 128).data,
      highlighted,
      normal,
    };
  }));
};

const glyphAdvance = (char: string) =>
  minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  0;

const advance = (text: string) =>
  Math.ceil([...text].reduce((sum, char) => sum + glyphAdvance(char), 0));

const trimToWidth = function trimToWidth(
  text: string,
  width: number,
  backwards = false
) {
  let length = 0;
  let used = 0;

  const chars = backwards ? [...text].reverse() : [...text];

  for (const char of chars) {
    const next = glyphAdvance(char);

    if (used + next > width) {
      break;
    }

    used += next;
    length += char.length;
  }

  return backwards ? text.slice(text.length - length) : text.slice(0, length);
};

const scrollTo = function scrollTo(
  text: string,
  start: number,
  position: number,
  width: number
) {
  start = Math.min(start, text.length);
  const end = start + trimToWidth(text.slice(start), width).length;

  if (position === start) {
    start -= trimToWidth(text, width, true).length;
  }

  if (position > end) {
    start += position - end;
  } else if (position <= start) {
    start = position;
  }

  return Math.max(0, Math.min(text.length, start));
};

const field = function field(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  scale: number
) {
  const widths = [1, 198, 1];
  const heights = [1, 18, 1];

  const destinationWidths = [scale, width - 2 * scale, scale];
  const destinationHeights = [scale, height - 2 * scale, scale];

  for (
    let dy = 0, row = 0, sy = 0;
    row < 3;
    sy += heights[row], dy += destinationHeights[row], row += 1
  ) {
    for (
      let column = 0, dx = 0, sx = 0;
      column < 3;
      sx += widths[column], dx += destinationWidths[column], column += 1
    ) {
      for (let y = 0; y < destinationHeights[row]; y += heights[row] * scale) {
        for (
          let x = 0;
          x < destinationWidths[column];
          x += widths[column] * scale
        ) {
          const w = Math.min(
            widths[column] * scale,
            destinationWidths[column] - x
          );

          const h = Math.min(heights[row] * scale, destinationHeights[row] - y);

          context.drawImage(
            image,
            sx,
            sy,
            w / scale,
            h / scale,
            dx + x,
            dy + y,
            w,
            h
          );
        }
      }
    }
  }
};

const text = function text(
  context: CanvasRenderingContext2D,
  alpha: Uint8ClampedArray,
  value: string,
  x: number,
  y: number,
  ink: number,
  scale: number
) {
  for (const shadow of [true, false]) {
    let offset = x;
    const color = shadow ? Math.floor(ink / 4) : ink;
    context.fillStyle = `rgb(${color},${color},${color})`;

    for (const char of value) {
      const glyph = minecraftGlyphs[char.codePointAt(0)! - 32];

      if (!glyph) {
        const unihex = getUnihexGlyph(char);

        if (unihex) {
          paintUnihex(
            context,
            unihex,
            offset + (shadow ? 0.5 : 0),
            y + (shadow ? 0.5 : 0),
            scale
          );
        }

        offset += glyphAdvance(char);
        continue;
      }

      const [gx, gy, width] = glyph;

      if (char !== " ") {
        for (let py = 0; py < 8; py += 1) {
          for (let px = 0; px < 8; px += 1) {
            if (alpha[((gy + py) * 128 + gx + px) * 4 + 3]) {
              context.fillRect(
                (offset + px + Number(shadow)) * scale,
                (y + py + Number(shadow)) * scale,
                scale,
                scale
              );
            }
          }
        }
      }

      offset += width;
    }
  }
};

/** Paints a native input's background, retaining the actual editable DOM input. */
export const attachMinecraftInput = function attachMinecraftInput(
  input: HTMLInputElement,
  initialScale: number
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true })!;

  let cancelled = false;
  let frame = 0;
  let signature = "";
  let start = 0;
  let wasFocused = document.activeElement === input;
  let focusedAt = Date.now();
  let previousValue = "";

  let loaded: Images;
  let loadingUnihex = false;

  const paint = () => {
    if (!loaded || cancelled) {
      return;
    }

    const style = getComputedStyle(input);
    const scale = Number(style.getPropertyValue("--mc-scale")) || initialScale;

    const width = input.clientWidth;
    const height = input.clientHeight;

    const bounds = input.getBoundingClientRect();
    positionUnihex(context, bounds);

    if (!width || !height) {
      return;
    }

    const { value } = input;
    const focused = document.activeElement === input;

    if (focused && !wasFocused) {
      focusedAt = Date.now();
    }

    wasFocused = focused;
    const blink = Math.floor((Date.now() - focusedAt) / 300) % 2 === 0;
    const chars = [...(value + input.placeholder)];

    if (
      !loadingUnihex &&
      chars.some((char) => isCJKCodepoint(char.codePointAt(0)!))
    ) {
      loadingUnihex = true;
      loadUnihex()
        .then(() => {
          signature = "";
          paint();
        })
        .catch((error: unknown) => {
          console.error(error);
        });
    }

    const supported =
      ["text", "search", "url", "tel"].includes(input.type) &&
      chars.every(
        (char) => /^[\u0020-\u007E]$/u.test(char) || getUnihexGlyph(char)
      ) &&
      style.direction !== "rtl";

    if (input.dataset.mcBitmap !== String(supported)) {
      input.dataset.mcBitmap = String(supported);
    }

    const cursor =
      input.selectionDirection === "backward"
        ? (input.selectionStart ?? value.length)
        : (input.selectionEnd ?? value.length);

    const anchor =
      input.selectionDirection === "backward"
        ? (input.selectionEnd ?? cursor)
        : (input.selectionStart ?? cursor);

    if (previousValue !== value) {
      start = 0;
      previousValue = value;
    }

    const nextSignature = JSON.stringify([
      width,
      height,
      scale,
      value,
      cursor,
      anchor,
      focused,
      blink && focused,
      input.disabled,
      input.readOnly,
      input.placeholder,
      input.maxLength,
      supported,
      bounds.x,
      bounds.y,
      innerWidth,
      innerHeight,
    ]);

    if (nextSignature === signature) {
      return;
    }

    signature = nextSignature;
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    field(
      context,
      focused && !input.disabled ? loaded.highlighted : loaded.normal,
      width,
      height,
      scale
    );

    if (supported) {
      const innerWidth = width / scale - 8;
      start = scrollTo(value, start, cursor, innerWidth);
      const visible = trimToWidth(value.slice(start), innerWidth);

      const local = cursor - start;
      const cursorInView = local >= 0 && local <= visible.length;

      const ink = input.readOnly || input.disabled ? 112 : 224;
      const y = Math.floor((height / scale - 8) / 2);

      const insert =
        cursor < value.length ||
        (input.maxLength >= 0 && value.length >= input.maxLength);

      let cursorX = 4;

      if (visible.length) {
        const prefix = cursorInView ? visible.slice(0, local) : visible;
        text(context, loaded.alpha, prefix, 4, y, ink, scale);
        cursorX += advance(prefix) + 1;
      }

      if (cursorInView && insert) {
        cursorX -= 1;
      }

      if (cursorInView && local < visible.length) {
        text(
          context,
          loaded.alpha,
          visible.slice(local),
          cursorX,
          y,
          ink,
          scale
        );
      }

      if (!visible.length && !focused && input.placeholder) {
        text(context, loaded.alpha, input.placeholder, 4, y, 85, scale);
      }

      const anchorLocal = Math.max(0, Math.min(visible.length, anchor - start));

      if (anchorLocal !== local) {
        const other = Math.min(
          width / scale,
          4 + advance(visible.slice(0, anchorLocal)) - 1
        );

        const here = Math.min(width / scale, cursorX);

        const left = Math.max(0, Math.min(here, other) * scale);
        const right = Math.min(width, Math.max(here, other) * scale);

        if (right > left) {
          const pixels = context.getImageData(
            left,
            (y - 1) * scale,
            right - left,
            11 * scale
          );

          for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i] = 255 - pixels.data[i];
            pixels.data[i + 1] = 255 - pixels.data[i + 1];
            pixels.data[i + 2] = 255;
          }

          context.putImageData(pixels, left, (y - 1) * scale);
        }
      }

      if (focused && blink && cursorInView) {
        if (insert) {
          context.fillStyle = `rgb(${ink},${ink},${ink})`;
          context.fillRect(cursorX * scale, (y - 1) * scale, scale, 11 * scale);
        } else {
          text(context, loaded.alpha, "_", cursorX, y, ink, scale);
        }
      }
    }

    input.style.setProperty("--mc-input-image", `url("${canvas.toDataURL()}")`);
    input.dataset.mcReady = "true";
  };

  const tick = () => {
    paint();

    if (!cancelled) {
      frame = requestAnimationFrame(tick);
    }
  };

  const focus = () => {
    wasFocused = true;
    focusedAt = Date.now();
    signature = "";
    paint();
  };

  const blur = () => {
    wasFocused = false;
    signature = "";
    paint();
  };

  input.addEventListener("focus", focus);
  input.addEventListener("blur", blur);
  loadImages()
    .then((result) => {
      if (!cancelled) {
        loaded = result;
        tick();
      }
    })
    .catch((error: unknown) => {
      if (!cancelled) {
        input.dataset.mcBitmap = "false";
        console.error(error);
      }
    });

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    disposeUnihex(context);
    input.removeEventListener("focus", focus);
    input.removeEventListener("blur", blur);
  };
};
