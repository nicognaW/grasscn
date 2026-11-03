import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { popoverGlyphAtlas } from "./minecraft-popover-atlas";
import {
  positionPopoverGlyphs,
  paintPopoverGlyph,
  disposePopoverGlyphs,
} from "./minecraft-popover-gpu";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-unicode.css";

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

const observedPopoverGlyphs: Partial<typeof popoverGlyphAtlas> =
  popoverGlyphAtlas;

interface PopoverUnicodeStyle extends React.CSSProperties {
  "--mc-popover-unicode-height": string;
  "--mc-popover-unicode-width": string;
}

let alpha: Promise<Uint8ClampedArray> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached image Promise itself, including rejection; async would wrap its identity.
const loadAlpha = function loadAlpha() {
  // oxlint-disable-next-line promise/avoid-new -- Preserve the cached Image load/error bridge and its onload alpha-extraction phase.
  return (alpha ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const context = c.getContext("2d")!;
      context.drawImage(image, 0, 0);
      resolve(context.getImageData(0, 0, 128, 128).data);
    };

    image.onerror = reject;
    image.src = minecraftInputAssets.atlas;
  }));
};

export const PopoverUnicodeLine = ({
  text,
  bold,
  scale,
  width,
}: {
  text: string;
  bold: boolean;
  scale: number;
  width: number;
}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let signature = "";

    const canvas = ref.current!;
    const context = canvas.getContext("2d")!;

    setReady(false);
    void Promise.all([loadUnihex(), loadAlpha()]).then(([, source]) => {
      if (disposed) {
        return;
      }

      const glyphs = [...text].map((char) => {
        const code = char.codePointAt(0)!;
        const ascii = asciiGlyphs[code - 32];
        const uni = getUnihexGlyph(char);
        const observed = observedPopoverGlyphs[code.toString(16)];

        let selectedW: number;

        if (observed) {
          selectedW = Math.round((observed.u1 - observed.u0) * 256 + 0.02);
        } else if (ascii) {
          selectedW = 8;
        } else {
          selectedW = uni?.width ?? 0;
        }

        const w = selectedW;

        const h = ascii ? 8 : 16;
        const pixels = new Uint8Array(w * h * 4);

        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            let selectedOn: number;

            if (ascii) {
              selectedOn =
                source[((ascii[1] + y) * 128 + ascii[0] + x) * 4 + 3];
            } else if (uni) {
              selectedOn =
                // oxlint-disable-next-line no-bitwise -- Unihex rows store one bit per glyph column; extract the selected column bit.
                ((uni.rows[y] >>> (uni.bitWidth - 1 - x - uni.left)) & 1) * 255;
            } else {
              selectedOn = 0;
            }

            const on = selectedOn;

            pixels.set([255, 255, 255, on], (y * w + x) * 4);
          }
        }

        return {
          advance: observed?.advance ?? ascii?.[2] ?? uni?.advance ?? 0,
          boldOffset: observed?.boldOffset ?? (ascii ? 1 : 0.5),
          char,
          code,
          h,
          pixels,
          shadowOffset: observed?.shadowOffset ?? (ascii ? 1 : 0.5),
          w,
        };
      });

      const tick = () => {
        if (disposed) {
          return;
        }

        const bounds = canvas.getBoundingClientRect();

        const next = JSON.stringify([
          bounds.x,
          bounds.y,
          innerWidth,
          innerHeight,
        ]);

        if (next !== signature) {
          signature = next;
          canvas.width = Math.max(1, width * scale);
          canvas.height = 9 * scale;
          context.imageSmoothingEnabled = false;
          positionPopoverGlyphs(context, bounds);
          let supported = true;
          let x = 0;

          for (const glyph of glyphs) {
            for (const shadow of [true, false]) {
              context.fillStyle = shadow ? "#3f3f3f" : "#ffffff";

              if (glyph.char !== " ") {
                for (let copy = 0; copy < (bold ? 2 : 1); copy += 1) {
                  supported =
                    paintPopoverGlyph(
                      context,
                      glyph.code,
                      glyph.pixels,
                      glyph.w,
                      glyph.h,
                      x +
                        copy * glyph.boldOffset +
                        (shadow ? glyph.shadowOffset : 0),
                      shadow ? glyph.shadowOffset : 0,
                      scale,
                      bold
                    ) && supported;
                }
              }
            }

            x += glyph.advance + (bold ? glyph.boldOffset : 0);
          }

          setReady(supported);
        }

        frame = requestAnimationFrame(tick);
      };

      tick();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      disposePopoverGlyphs(context);
    };
  }, [text, bold, scale, width]);

  const lineStyle: PopoverUnicodeStyle = {
    "--mc-popover-unicode-height": `${9 * scale}px`,
    "--mc-popover-unicode-width": `${width * scale}px`,
  };

  return (
    <span className="mc-popover-unicode" style={lineStyle}>
      <canvas
        ref={ref}
        data-mc-popover-unicode-ready={ready}
        aria-hidden="true"
        className="mc-popover-unicode-canvas"
      />
      <span className="mc-popover-unicode-fallback">{text}</span>
    </span>
  );
};
