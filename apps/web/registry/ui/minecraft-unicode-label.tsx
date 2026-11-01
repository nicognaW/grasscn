"use client";

import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { getUnihexGlyph, loadUnihex, paintUnihex } from "./minecraft-unifont";
import {
  positionUnihex,
  disposeUnihex,
  setUnihexAtlas,
} from "./minecraft-unifont-gpu";
import type { UnihexAtlas } from "./minecraft-unifont-gpu";

let alpha: Promise<Uint8ClampedArray> | undefined;

function loadAlpha() {
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
}

const advance = (char: string) =>
  minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  0;

export const MinecraftUnicodeLabel = ({
  text,
  atlas,
}: {
  text: string;
  atlas?: UnihexAtlas;
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
    setUnihexAtlas(context, atlas);
    setBitmap(false);
    Promise.all([loadUnihex(), loadAlpha()])
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
          const ink = Number(style.color.match(/[\d.]+/g)?.[0] ?? 255);

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
            positionUnihex(context, bounds);

            for (const shadow of [true, false]) {
              let x = 0;
              const color = shadow ? Math.floor(ink / 4) : ink;
              context.fillStyle = `rgb(${color},${color},${color})`;

              for (const char of text) {
                const glyph = minecraftGlyphs[char.codePointAt(0)! - 32];

                if (glyph) {
                  if (char !== " ") {
                    for (let y = 0; y < 8; y++) {
                      for (let px = 0; px < 8; px++) {
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
                  const glyph = getUnihexGlyph(char)!;
                  paintUnihex(
                    context,
                    glyph,
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
      disposeUnihex(context);
    };
  }, [text, atlas]);

  return (
    <span
      ref={root}
      data-mc-label-ready={bitmap}
      style={{
        display: "inline-block",
        height: "calc(8 * var(--mc-pixel))",
        position: "relative",
        textShadow: "none",
        width: width == null ? undefined : `calc(${width} * var(--mc-pixel))`,
      }}
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        style={{
          height: "calc(9 * var(--mc-pixel))",
          left: 0,
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          visibility: bitmap ? "visible" : "hidden",
          width: "100%",
        }}
      />
      <span className={bitmap ? "mc-text-accessible" : undefined}>{text}</span>
    </span>
  );
};
