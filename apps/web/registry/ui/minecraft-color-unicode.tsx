"use client";

import * as React from "react";

import {
  positionColorUnihex,
  disposeColorUnihex,
  setColorUnihexAtlas,
  paintColorUnihexGPU,
} from "./minecraft-color-unicode-gpu";
import type { ColorUnihexAtlas } from "./minecraft-color-unicode-gpu";
import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";
import type { UnihexGlyph } from "./minecraft-unifont";

import "./minecraft-unicode.css";

interface ColorUnicodeLabelStyle extends React.CSSProperties {
  "--mc-unicode-width": string;
}

let alpha: Promise<Uint8ClampedArray> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached image Promise itself, including rejection; async would wrap its identity.
const loadAlpha = function loadAlpha() {
  // oxlint-disable-next-line promise/avoid-new -- Preserve the cached Image load/error bridge and its onload alpha-extraction phase.
  return (alpha ??= new Promise((resolve, reject) => {
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
};

const advance = (char: string) =>
  minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  0;

export const MinecraftColorUnicodeLabel = ({
  text,
  atlas,
}: {
  text: string;
  atlas?: ColorUnihexAtlas;
}) => {
  const root = React.useRef<HTMLSpanElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);

  const [width, setWidth] = React.useState<number>();
  const [bitmap, setBitmap] = React.useState(false);

  React.useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let signature = "";

    const context = canvas.current!.getContext("2d")!;
    setColorUnihexAtlas(context, atlas);
    setBitmap(false);
    Promise.all([
      /\P{ASCII}/u.test(text) ? loadUnihex() : Promise.resolve(),
      loadAlpha(),
    ])
      .then(([, pixels]) => {
        if (disposed) {
          return;
        }

        if (
          ![...text].every(
            (char) => /^[\u0020-\u007E]$/u.test(char) || getUnihexGlyph(char)
          )
        ) {
          setWidth(undefined);

          return;
        }

        const logicalWidth = Math.ceil(
          [...text].reduce((sum, char) => sum + advance(char), 0)
        );

        setWidth(logicalWidth);

        const tick = () => {
          if (disposed) {
            return;
          }

          const node = root.current!;
          const style = getComputedStyle(node);
          const scale = Number(style.getPropertyValue("--mc-scale")) || 2;

          const bounds = node.getBoundingClientRect();

          const ink = style.color.match(/[\d.]+/gu)?.map(Number) ?? [
            255, 255, 255, 1,
          ];

          const next = JSON.stringify([
            scale,
            bounds.x,
            bounds.y,
            bounds.width,
            ink,
            innerWidth,
            innerHeight,
          ]);

          if (
            Math.abs(bounds.width - logicalWidth * scale) < 0.1 &&
            next !== signature
          ) {
            signature = next;
            context.canvas.width = Math.max(1, logicalWidth * scale);
            context.canvas.height = 9 * scale;
            context.imageSmoothingEnabled = false;
            positionColorUnihex(context, bounds);

            for (const shadow of [true, false]) {
              let x = 0;

              const color = shadow
                ? ink.slice(0, 3).map((value) => Math.floor(value / 4))
                : ink.slice(0, 3);

              context.fillStyle = `rgba(${color.join(",")},${ink[3] ?? 1})`;

              for (const char of text) {
                const glyph = minecraftGlyphs[char.codePointAt(0)! - 32];

                if (glyph) {
                  if (char !== " ") {
                    for (let y = 0; y < 8; y += 1) {
                      for (let px = 0; px < 8; px += 1) {
                        if (
                          pixels[((glyph[1] + y) * 128 + glyph[0] + px) * 4 + 3]
                        ) {
                          context.fillRect(
                            (x + px + Number(shadow)) * scale,
                            (y + Number(shadow)) * scale,
                            scale,
                            scale
                          );
                        }
                      }
                    }
                  }
                } else {
                  const unicodeGlyph = getUnihexGlyph(char)!;
                  paintUnihex(
                    context,
                    unicodeGlyph,
                    x + (shadow ? 0.5 : 0),
                    shadow ? 0.5 : 0,
                    scale
                  );
                }

                x += advance(char);
              }
            }

            setBitmap(true);
          }

          frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!disposed) {
          setBitmap(false);
        }
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      disposeColorUnihex(context);
    };
  }, [text, atlas]);

  const labelStyle: ColorUnicodeLabelStyle = {
    "--mc-unicode-width":
      width === undefined ? "auto" : `calc(${width} * var(--mc-pixel))`,
  };

  return (
    <span
      ref={root}
      data-mc-label-ready={bitmap}
      className="mc-unicode-label"
      style={labelStyle}
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        className="mc-unicode-label-canvas"
      />
      <span className={bitmap ? "mc-text-accessible" : undefined}>{text}</span>
    </span>
  );
};

const paintUnihex = function paintUnihex(
  context: CanvasRenderingContext2D,
  glyph: UnihexGlyph,
  x: number,
  y: number,
  scale: number
) {
  if (paintColorUnihexGPU(context, glyph, x, y, scale)) {
    return;
  }

  const left = x * scale;
  const top = y * scale;
  const width = (glyph.width / 2) * scale;
  const height = 8 * scale;

  for (
    let py = Math.floor(top + 0.5);
    py < Math.floor(top + height + 0.5);
    py += 1
  ) {
    const sy = Math.max(
      0,
      Math.min(
        15,
        Math.floor(0.01 + ((py + 0.5 - top) / height) * 15.98 - 1e-6)
      )
    );

    for (
      let px = Math.ceil(left - 0.5);
      px < Math.ceil(left + width - 0.5);
      px += 1
    ) {
      const sx =
        Math.floor(
          0.01 + ((px + 0.5 - left) / width) * (glyph.width - 0.02) - 1e-6
        ) + glyph.left;

      if (
        sx >= 0 &&
        sx < glyph.bitWidth &&
        // oxlint-disable-next-line no-bitwise -- Unihex rows store one bit per glyph column; extract the selected column bit.
        (glyph.rows[sy] >>> (glyph.bitWidth - 1 - sx)) & 1
      ) {
        context.fillRect(px, py, 1, 1);
      }
    }
  }
};
