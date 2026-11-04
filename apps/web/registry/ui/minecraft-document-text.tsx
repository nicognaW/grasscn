"use client";

import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import {
  useCanvasPaintConnection,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import { getUnihexGlyph, loadUnihex, paintUnihex } from "./minecraft-unifont";

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-registry-ui-minecraft-document-text-1-visibility": string;
}

interface DocumentLayoutStyle extends React.CSSProperties {
  "--mc-document-height": string;
  "--mc-document-width": string;
}

interface DocumentFallbackStyle extends React.CSSProperties {
  "--mc-document-fallback-color": string;
}

let bitmap: Promise<HTMLImageElement> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached image Promise itself, including rejection; async would wrap its identity.
const fontImage = function fontImage() {
  // oxlint-disable-next-line promise/avoid-new -- Keep this cached Image event Promise, including its loaded-element result and rejection.
  return (bitmap ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      resolve(image);
    });

    image.addEventListener("error", reject);
    image.src = minecraftInputAssets.atlas;
  }));
};

const documentTextWidth = function documentTextWidth(text: string) {
  let accumulatedGlyphAdvance = 0;

  for (const advanceCharacter of text) {
    accumulatedGlyphAdvance +=
      asciiGlyphs[
        // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
        (advanceCharacter.codePointAt(0) as number) - 32
      ]?.[2] ??
      getUnihexGlyph(advanceCharacter)?.advance ??
      6;
  }

  return accumulatedGlyphAdvance;
};

const documentLines = function documentLines(text: string, width: number) {
  const lines: string[] = [];

  for (let line of text.split("\n")) {
    while (documentTextWidth(line) > width) {
      const chars: string[] = [];

      for (const bufferCharacter of line) {
        chars.push(bufferCharacter);
      }

      let count = 0;
      let used = 0;
      let space = -1;

      while (count < chars.length) {
        const c = chars[count];
        const next = documentTextWidth(c);

        if (used + next > width && count > 0) {
          break;
        }

        if (c === " ") {
          space = count;
        }

        used += next;
        count += 1;
      }

      const split = space > 0 ? space : Math.max(1, count);
      lines.push(chars.slice(0, split).join(""));
      line = chars.slice(split + (space > 0 ? 1 : 0)).join("");
    }

    lines.push(line);
  }

  return lines;
};

const MinecraftDocumentText = ({
  text,
  width = 114,
  scale = 2,
  color = "#000000",
  align = "left",
  wrap = true,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  text: string;
  width?: number;
  scale?: 1 | 2 | 3;
  color?: string;
  align?: "left" | "right" | "center";
  wrap?: boolean;
}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const { attach, connection } = useCanvasPaintConnection(ref);

  const paintInputs = React.useMemo(
    () => ({ align, color, connection, scale, text, width, wrap }),
    [text, width, scale, color, align, wrap, connection]
  );

  const [paintedInputs, setPaintedInputs] =
    React.useState<typeof paintInputs>();

  const ready = paintedInputs === paintInputs;
  const [height, setHeight] = React.useState(9);

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
      fontImage(),
      /[^\u0020-\u007E\n]/u.test(paintInputs.text)
        ? loadUnihex()
        : Promise.resolve(),
    ]);

    const paintAfterGlyphResources = async () => {
      const [image] = await glyphResources;

      if (!live) {
        return;
      }

      const lines = paintInputs.wrap
        ? documentLines(paintInputs.text, paintInputs.width)
        : [paintInputs.text];

      canvas.width = paintInputs.width * paintInputs.scale;
      canvas.height = lines.length * 9 * paintInputs.scale;
      setHeight(lines.length * 9);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error(
          "Minecraft document text 2D canvas context could not be created"
        );
      }

      ctx.imageSmoothingEnabled = false;

      for (const [lineIndex, line] of lines.entries()) {
        let x = 0;

        if (paintInputs.align === "right") {
          x = paintInputs.width - documentTextWidth(line);
        } else if (paintInputs.align === "center") {
          x =
            Math.floor(paintInputs.width / 2) -
            Math.floor(documentTextWidth(line) / 2);
        }

        for (const char of line) {
          const glyph =
            asciiGlyphs[
              // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
              (char.codePointAt(0) as number) - 32
            ];

          if (glyph) {
            if (char !== " ") {
              ctx.drawImage(
                image,
                glyph[0],
                glyph[1],
                glyph[2],
                8,
                x * paintInputs.scale,
                lineIndex * 9 * paintInputs.scale,
                glyph[2] * paintInputs.scale,
                8 * paintInputs.scale
              );
            }

            x += glyph[2];
          } else {
            const unicodeGlyph = getUnihexGlyph(char);

            if (unicodeGlyph) {
              ctx.fillStyle = paintInputs.color;
              paintUnihex(
                ctx,
                unicodeGlyph,
                x,
                lineIndex * 9,
                paintInputs.scale
              );
              x += unicodeGlyph.advance;
            }
          }
        }
      }

      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = paintInputs.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  const fallbackStyle: DocumentFallbackStyle | undefined = ready
    ? undefined
    : {
        "--mc-document-fallback-color": color,
      };

  return (
    <span
      {...props}
      data-slot="document-text"
      data-ready={ready}
      className={cn(
        "relative block h-(--mc-document-height) w-(--mc-document-width)",
        className
      )}
      style={minecraftStyle(style, (__style): DocumentLayoutStyle => ({
        "--mc-document-height": `${height * scale}px`,
        "--mc-document-width": `${width * scale}px`,
        ...__style,
      }))}
    >
      <canvas
        ref={attach}
        aria-hidden="true"
        className="[visibility:var(--mc-intrinsic-registry-ui-minecraft-document-text-1-visibility)] block [image-rendering:pixelated]"
        style={
          // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
          {
            "--mc-intrinsic-registry-ui-minecraft-document-text-1-visibility":
              ready ? "visible" : "hidden",
          } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
        }
      />
      <span
        className={
          ready
            ? "absolute h-px w-px overflow-hidden [clip-path:inset(50%)]"
            : "absolute inset-0 text-(--mc-document-fallback-color)"
        }
        style={fallbackStyle}
      >
        {text}
      </span>
    </span>
  );
};

export { MinecraftDocumentText, documentTextWidth };
