import * as React from "react";

import { dialogUnihexAtlas } from "./minecraft-dialog-atlas";
import {
  positionUnihex,
  disposeUnihex,
  setUnihexAtlas,
  paintUnihexGPU,
} from "./minecraft-dialog-gpu";
import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

interface DialogUnicodeStyle extends React.CSSProperties {
  "--mc-dialog-unicode-height": string;
  "--mc-dialog-unicode-width": string;
}

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

let alpha: Promise<Uint8ClampedArray> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached image Promise itself, including rejection; async would wrap its identity.
const loadAlpha = function loadAlpha() {
  // oxlint-disable-next-line promise/avoid-new -- Preserve the cached Image load/error bridge and its onload alpha-extraction phase.
  return (alpha ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const c = document.createElement("canvas");
      c.height = 128;
      c.width = 128;
      const context = c.getContext("2d")!;
      context.drawImage(image, 0, 0);
      resolve(context.getImageData(0, 0, 128, 128).data);
    });

    image.addEventListener("error", reject);
    image.src = minecraftInputAssets.atlas;
  }));
};

export const DialogUnicodeLine = ({
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

    const canvas =
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      ref.current as HTMLCanvasElement;

    const context = canvas.getContext("2d")!;

    setUnihexAtlas(context, dialogUnihexAtlas);
    setReady(false);
    const glyphResources = Promise.all([loadUnihex(), loadAlpha()]);

    const paintAfterGlyphResources = async () => {
      const [, pixels] = await glyphResources;

      if (disposed) {
        return;
      }

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
          positionUnihex(context, bounds);

          for (const shadow of [true, false]) {
            context.fillStyle = shadow ? "#3f3f3f" : "#ffffff";
            let x = 0;

            for (const char of text) {
              const ascii =
                asciiGlyphs[
                  // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
                  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
                  (char.codePointAt(0) as number) - 32
                ];

              const uni = getUnihexGlyph(char);
              const offset = ascii ? 1 : 0.5;

              for (let copy = 0; copy < (bold ? 2 : 1); copy += 1) {
                const dx = x + copy * offset + (shadow ? offset : 0);
                const dy = shadow ? offset : 0;

                if (ascii) {
                  if (char !== " ") {
                    for (let y = 0; y < 8; y += 1) {
                      for (let px = 0; px < 8; px += 1) {
                        if (
                          pixels[((ascii[1] + y) * 128 + ascii[0] + px) * 4 + 3]
                        ) {
                          context.fillRect(
                            (dx + px) * scale,
                            (dy + y) * scale,
                            scale,
                            scale
                          );
                        }
                      }
                    }
                  }
                } else if (uni) {
                  paintUnihexGPU(context, uni, dx, dy, scale, bold ? 0.1 : 0);
                }
              }

              x += (ascii?.[2] ?? uni?.advance ?? 0) + (bold ? offset : 0);
            }
          }

          setReady(true);
        }

        frame = requestAnimationFrame(tick);
      };

      tick();
    };

    void paintAfterGlyphResources();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      disposeUnihex(context);
    };
  }, [text, bold, scale, width]);

  const canvasStyle: DialogUnicodeStyle = {
    "--mc-dialog-unicode-height": `${9 * scale}px`,
    "--mc-dialog-unicode-width": `${width * scale}px`,
  };

  return (
    <canvas
      ref={ref}
      data-mc-dialog-unicode-ready={ready}
      aria-hidden="true"
      className="block h-(--mc-dialog-unicode-height) w-(--mc-dialog-unicode-width)"
      style={canvasStyle}
    />
  );
};
