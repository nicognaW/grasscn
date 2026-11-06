"use client";

import * as React from "react";

import { documentTextWidth } from "./minecraft-document-text";
import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { useCanvasPaintConnection } from "./minecraft-render";
import { paintSignGpu } from "./minecraft-sign-gpu";
import { loadUnihex, getUnihexGlyph, paintUnihex } from "./minecraft-unifont";

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

const images = new Map<string, Promise<HTMLImageElement>>();

// oxlint-disable-next-line typescript/promise-function-async -- Return the per-source image Promise itself, including cached rejection; async would wrap it.
const load = function load(src: string) {
  let promise = images.get(src);

  if (!promise) {
    // oxlint-disable-next-line promise/avoid-new -- Keep the per-source Image event Promise, including cached rejection.
    promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => {
        resolve(image);
      });

      image.addEventListener("error", reject);
      image.src = src;
    });
    images.set(src, promise);
  }

  return promise;
};

/** Own target sizing, output pixels and scratch context for one sign paint. */
const createSignRasterSurfaces = function createSignRasterSurfaces(
  canvas: HTMLCanvasElement,
  scale: number,
  hanging: boolean
) {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Minecraft sign paint 2D canvas context could not be created"
    );
  }

  const width = 120 * scale;
  const height = (hanging ? 74 : 110) * scale;

  canvas.width = width;
  canvas.height = height;

  const output = ctx.createImageData(width, height);
  const scratch = document.createElement("canvas");
  const sc = scratch.getContext("2d");

  if (!sc) {
    throw new Error(
      "Minecraft sign paint 2D canvas context could not be created"
    );
  }

  return { ctx, height, output, sc, scratch, width };
};

export const MinecraftSignPaint = ({
  src,
  lines,
  scale,
  color,
  hanging,
}: {
  src: string;
  lines: readonly string[];
  scale: number;
  color: string;
  hanging: boolean;
}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const { attach, connection } = useCanvasPaintConnection(ref);
  const [revision, setRevision] = React.useState(0);

  const paintInputs = React.useMemo(
    () => ({ color, connection, hanging, lines, revision, scale, src }),
    [src, lines, scale, color, hanging, revision, connection]
  );

  const [paintedInputs, setPaintedInputs] =
    React.useState<typeof paintInputs>();

  const ready = paintedInputs === paintInputs;

  React.useEffect(() => {
    const repaint = () => {
      setRevision((v) => v + 1);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        repaint();
      }
    });

    observer.observe(
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      ref.current as HTMLCanvasElement
    );
    window.addEventListener("resize", repaint);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", repaint);
    };
  }, []);
  React.useEffect((): (() => void) | undefined => {
    const attachment = paintInputs.connection;

    if (attachment === null) {
      return undefined;
    }

    // SAFETY: React attaches this private, unkeyed <canvas> before effect setup. The ref has one intrinsic attachment and no other writer; existing cleanup guards or cancels every deferred use.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The owned intrinsic commit and existing effect lifetime prove this exact HTMLCanvasElement capture.
    const canvas = ref.current as HTMLCanvasElement;

    let live = true;

    const glyphResources = Promise.all([
      load(paintInputs.src),
      load(minecraftInputAssets.atlas),
      paintInputs.lines.some((line) => /[^\u0020-\u007E]/u.test(line))
        ? loadUnihex()
        : Promise.resolve(),
    ]);

    const paintAfterGlyphResources = async () => {
      const [texture, font] = await glyphResources;

      if (!live) {
        return;
      }

      const { ctx, height, output, sc, scratch, width } =
        createSignRasterSurfaces(
          canvas,
          paintInputs.scale,
          paintInputs.hanging
        );

      const f = Math.fround;

      const draw = (
        source: ImageData,
        left: number,
        top: number,
        right: number,
        bottom: number
      ) => {
        for (
          let y = Math.max(0, Math.ceil(top - 0.5));
          y < Math.min(height, Math.ceil(bottom - 0.5));
          y += 1
        ) {
          for (
            let x = Math.max(0, Math.ceil(left - 0.5));
            x < Math.min(width, Math.ceil(right - 0.5));
            x += 1
          ) {
            const sx = Math.max(
              0,
              Math.min(
                source.width - 1,
                Math.floor(
                  f(f((x + 0.5 - left) / (right - left)) * source.width)
                )
              )
            );

            const sy = Math.max(
              0,
              Math.min(
                source.height - 1,
                Math.floor(
                  f(f((y + 0.5 - top) / (bottom - top)) * source.height)
                )
              )
            );

            const i = (sy * source.width + sx) * 4;
            const j = (y * width + x) * 4;
            const alpha = source.data[i + 3] / 255;

            if (!alpha) {
              continue;
            }

            for (let k = 0; k < 3; k += 1) {
              output.data[j + k] = source.data[i + k];
            }

            output.data[j + 3] = source.data[i + 3];
          }
        }
      };

      scratch.width = texture.naturalWidth;
      scratch.height = texture.naturalHeight;
      sc.drawImage(texture, 0, 0);

      const factor = f((paintInputs.hanging ? 4.5 : 3.9) * paintInputs.scale);
      const origin = (paintInputs.hanging ? 50 : 30) * paintInputs.scale;
      const tx = 60 * paintInputs.scale;
      const ty = origin + (paintInputs.hanging ? -13 : 27) * paintInputs.scale;
      const halfX = paintInputs.hanging ? 8 : 12;
      const halfY = paintInputs.hanging ? 8 : 13;

      draw(
        sc.getImageData(0, 0, scratch.width, scratch.height),
        f(tx + f(-halfX * factor)),
        f(ty + f(-halfY * factor)),
        f(tx + f(halfX * factor)),
        f(ty + f(halfY * factor))
      );

      const textScale = f(
        (paintInputs.hanging ? 1 : f(0.9765628)) * paintInputs.scale
      );

      for (const [index, line] of paintInputs.lines.entries()) {
        const textWidth = documentTextWidth(line);

        if (!textWidth) {
          continue;
        }

        scratch.width = textWidth;
        scratch.height = 9;
        sc.imageSmoothingEnabled = false;
        let x = 0;

        for (const char of line) {
          const glyph =
            asciiGlyphs[
              // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
              (char.codePointAt(0) as number) - 32
            ];

          if (glyph) {
            if (char !== " ") {
              sc.drawImage(
                font,
                glyph[0],
                glyph[1],
                glyph[2],
                8,
                x,
                0,
                glyph[2],
                8
              );
            }

            x += glyph[2];
          } else {
            const unicodeGlyph = getUnihexGlyph(char);

            if (unicodeGlyph) {
              sc.fillStyle = "#ffffff";
              paintUnihex(sc, unicodeGlyph, x, 0, 1);
              x += unicodeGlyph.advance;
            }
          }
        }

        sc.globalCompositeOperation = "source-in";
        sc.fillStyle = paintInputs.color;
        sc.fillRect(0, 0, scratch.width, scratch.height);
        sc.globalCompositeOperation = "source-over";

        const left = -Math.floor(textWidth / 2);

        const top =
          index * (paintInputs.hanging ? 9 : 10) -
          (paintInputs.hanging ? 18 : 20);

        draw(
          sc.getImageData(0, 0, scratch.width, 9),
          f(tx + f(left * textScale)),
          f(origin + f(top * textScale)),
          f(tx + f((left + textWidth) * textScale)),
          f(origin + f((top + 9) * textScale))
        );
      }

      const bounds = canvas.getBoundingClientRect();

      const gpu = paintInputs.lines.every((line) =>
        /^[\u0020-\u007E]*$/u.test(line)
      )
        ? paintSignGpu(
            texture,
            font,
            paintInputs.lines,
            paintInputs.scale,
            paintInputs.color,
            paintInputs.hanging,
            bounds.x,
            bounds.y
          )
        : undefined;

      ctx.putImageData(gpu ? new ImageData(gpu, width, height) : output, 0, 0);
      setPaintedInputs(paintInputs);
    };

    paintAfterGlyphResources().catch(() => {
      if (live) {
        setPaintedInputs(undefined);
      }
    });

    return () => {
      live = false;
    };
  }, [paintInputs]);

  return (
    <canvas
      ref={attach}
      width={120 * scale}
      height={(hanging ? 74 : 110) * scale}
      data-ready={ready}
      aria-hidden="true"
      className="block [image-rendering:pixelated]"
    />
  );
};
