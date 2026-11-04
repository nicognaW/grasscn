import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { menuGlyphAtlas } from "./minecraft-menu-atlas";
import {
  positionMenuGlyphs,
  paintMenuGlyph,
  disposeMenuGlyphs,
} from "./minecraft-menu-gpu";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-unicode.css";

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

const observedMenuGlyphs: Partial<typeof menuGlyphAtlas> = menuGlyphAtlas;

interface MenuUnicodeStyle extends React.CSSProperties {
  "--mc-menu-unicode-height": string;
  "--mc-menu-unicode-width": string;
}

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
      const context = c.getContext("2d");

      if (!context) {
        reject(
          new Error(
            "Minecraft menu unicode 2D canvas context could not be created"
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

export const MenuUnicodeLine = ({
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

  const input = React.useMemo(
    () => ({ bold, scale, text, width }),
    [bold, scale, text, width]
  );

  const [completion, setCompletion] = React.useState<{
    input: typeof input;
    supported: boolean;
  }>();

  const ready = completion?.input === input && completion.supported;

  React.useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let signature = "";

    const canvas =
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      ref.current as HTMLCanvasElement;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Minecraft menu unicode 2D canvas context could not be created"
      );
    }

    const glyphResources = Promise.all([loadUnihex(), loadAlpha()]);

    const paintAfterGlyphResources = async () => {
      const [, source] = await glyphResources;

      if (disposed) {
        return;
      }

      const glyphs = Array.from(input.text, (char) => {
        const code =
          // SAFETY: String Array.from iteration supplies a nonempty character. Its first code point therefore exists.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The verified glyph-character producer proves this specific codePointAt(0) result.
          char.codePointAt(0) as number;

        const ascii = asciiGlyphs[code - 32];
        const uni = getUnihexGlyph(char);
        const observed = observedMenuGlyphs[code.toString(16)];

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
        const ink = getComputedStyle(canvas).color;
        const channels = ink.match(/[\d.]+/gu)?.map(Number) ?? [255, 255, 255];

        const shade = `rgba(${channels
          .slice(0, 3)
          .map((value) => Math.floor(value / 4))
          .join(",")},${channels[3] ?? 1})`;

        const next = JSON.stringify([
          bounds.x,
          bounds.y,
          innerWidth,
          innerHeight,
          ink,
        ]);

        if (next !== signature) {
          signature = next;
          canvas.width = Math.max(1, input.width * input.scale);
          canvas.height = 9 * input.scale;
          context.imageSmoothingEnabled = false;
          positionMenuGlyphs(context, bounds);
          let supported = true;
          let x = 0;

          for (const glyph of glyphs) {
            for (const shadow of [true, false]) {
              context.fillStyle = shadow ? shade : ink;

              if (glyph.char !== " ") {
                for (let copy = 0; copy < (input.bold ? 2 : 1); copy += 1) {
                  supported =
                    paintMenuGlyph(
                      context,
                      glyph.code,
                      glyph.pixels,
                      glyph.w,
                      glyph.h,
                      x +
                        copy * glyph.boldOffset +
                        (shadow ? glyph.shadowOffset : 0),
                      shadow ? glyph.shadowOffset : 0,
                      input.scale,
                      input.bold
                    ) && supported;
                }
              }
            }

            x += glyph.advance + (input.bold ? glyph.boldOffset : 0);
          }

          setCompletion((previous) =>
            previous?.input === input && previous.supported === supported
              ? previous
              : { input, supported }
          );
        }

        frame = requestAnimationFrame(tick);
      };

      tick();
    };

    void paintAfterGlyphResources();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      disposeMenuGlyphs(context);
    };
  }, [input]);

  const lineStyle: MenuUnicodeStyle = {
    "--mc-menu-unicode-height": `${9 * scale}px`,
    "--mc-menu-unicode-width": `${width * scale}px`,
  };

  return (
    <span className="mc-menu-unicode" style={lineStyle}>
      <canvas
        ref={ref}
        data-mc-menu-unicode-ready={ready}
        aria-hidden="true"
        className="mc-menu-unicode-canvas"
      />
      <span className="mc-menu-unicode-fallback">{text}</span>
    </span>
  );
};
