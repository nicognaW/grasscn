"use client";

import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { minecraftStyle } from "./minecraft-render";
import { getUnihexGlyph, loadUnihex, paintUnihex } from "./minecraft-unifont";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-registry-ui-minecraft-document-text-1-visibility": string;
}

let bitmap: Promise<HTMLImageElement> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached image Promise itself, including rejection; async would wrap its identity.
const fontImage = function fontImage() {
  // oxlint-disable-next-line promise/avoid-new -- Keep this cached Image event Promise, including its loaded-element result and rejection.
  return (bitmap ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };

    image.onerror = reject;
    image.src = minecraftInputAssets.atlas;
  }));
};

const documentTextWidth = function documentTextWidth(text: string) {
  return [...text].reduce(
    (sum, c) =>
      sum +
      (minecraftGlyphs[c.codePointAt(0)! - 32]?.[2] ??
        getUnihexGlyph(c)?.advance ??
        6),
    0
  );
};

const documentLines = function documentLines(text: string, width: number) {
  const lines: string[] = [];

  for (let line of text.split("\n")) {
    while (documentTextWidth(line) > width) {
      const chars = [...line];

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
  const [ready, setReady] = React.useState(false);
  const [height, setHeight] = React.useState(9);

  React.useEffect(() => {
    let live = true;
    setReady(false);
    Promise.all([
      fontImage(),
      /[^\u0020-\u007E\n]/u.test(text) ? loadUnihex() : Promise.resolve(),
    ])
      .then(([image]) => {
        if (!live) {
          return;
        }

        const canvas = ref.current!;
        const lines = wrap ? documentLines(text, width) : [text];

        canvas.width = width * scale;
        canvas.height = lines.length * 9 * scale;
        setHeight(lines.length * 9);
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;

        for (const [lineIndex, line] of lines.entries()) {
          let x =
            align === "right"
              ? width - documentTextWidth(line)
              : align === "center"
                ? Math.floor(width / 2) -
                  Math.floor(documentTextWidth(line) / 2)
                : 0;

          for (const char of line) {
            const glyph = minecraftGlyphs[char.codePointAt(0)! - 32];

            if (glyph) {
              if (char !== " ") {
                ctx.drawImage(
                  image,
                  glyph[0],
                  glyph[1],
                  glyph[2],
                  8,
                  x * scale,
                  lineIndex * 9 * scale,
                  glyph[2] * scale,
                  8 * scale
                );
              }

              x += glyph[2];
            } else {
              const unicodeGlyph = getUnihexGlyph(char);

              if (unicodeGlyph) {
                ctx.fillStyle = color;
                paintUnihex(ctx, unicodeGlyph, x, lineIndex * 9, scale);
                x += unicodeGlyph.advance;
              }
            }
          }
        }

        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setReady(true);
      })
      .catch(() => {
        if (live) {
          setReady(false);
        }
      });

    return () => {
      live = false;
    };
  }, [text, width, scale, color, align, wrap]);

  return (
    <span
      {...props}
      data-slot="document-text"
      data-ready={ready}
      className={className}
      style={minecraftStyle(style, (__style) => ({
        display: "block",
        height: height * scale,
        position: "relative",
        width: width * scale,
        ...__style,
      }))}
    >
      <canvas
        ref={ref}
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
        style={
          ready
            ? {
                clipPath: "inset(50%)",
                height: 1,
                overflow: "hidden",
                position: "absolute",
                width: 1,
              }
            : { color, inset: 0, position: "absolute" }
        }
      >
        {text}
      </span>
    </span>
  );
};

export { MinecraftDocumentText, documentTextWidth };
