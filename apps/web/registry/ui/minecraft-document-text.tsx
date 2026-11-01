"use client";
import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { minecraftStyle } from "./minecraft-render";
import { getUnihexGlyph, loadUnihex, paintUnihex } from "./minecraft-unifont";
let bitmap: Promise<HTMLImageElement> | undefined;
function fontImage() {
  return (bitmap ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = minecraftInputAssets.atlas;
  }));
}
function documentTextWidth(text: string) {
  return Array.from(text).reduce(
    (sum, c) =>
      sum +
      (minecraftGlyphs[c.codePointAt(0)! - 32]?.[2] ??
        getUnihexGlyph(c)?.advance ??
        6),
    0
  );
}
function documentLines(text: string, width: number) {
  const lines: string[] = [];
  for (let line of text.split("\n")) {
    while (documentTextWidth(line) > width) {
      const chars = Array.from(line);
      let count = 0,
        used = 0,
        space = -1;
      while (count < chars.length) {
        const c = chars[count],
          next = documentTextWidth(c);
        if (used + next > width && count > 0) break;
        if (c === " ") space = count;
        used += next;
        count++;
      }
      const split = space > 0 ? space : Math.max(1, count);
      lines.push(chars.slice(0, split).join(""));
      line = chars.slice(split + (space > 0 ? 1 : 0)).join("");
    }
    lines.push(line);
  }
  return lines;
}
function MinecraftDocumentText({
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
}) {
  const ref = React.useRef<HTMLCanvasElement>(null),
    [ready, setReady] = React.useState(false),
    [height, setHeight] = React.useState(9);
  React.useEffect(() => {
    let live = true;
    setReady(false);
    Promise.all([
      fontImage(),
      /[^\x20-\x7e\n]/.test(text) ? loadUnihex() : Promise.resolve(),
    ])
      .then(([image]) => {
        if (!live) return;
        const canvas = ref.current!,
          lines = wrap ? documentLines(text, width) : [text];
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
              if (char !== " ")
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
              x += glyph[2];
            } else {
              const glyph = getUnihexGlyph(char);
              if (glyph) {
                ctx.fillStyle = color;
                paintUnihex(ctx, glyph, x, lineIndex * 9, scale);
                x += glyph.advance;
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
        if (live) setReady(false);
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
        position: "relative",
        width: width * scale,
        height: height * scale,
        ...__style,
      }))}
    >
      <canvas
        ref={ref}
        aria-hidden="true"
        style={{
          display: "block",
          imageRendering: "pixelated",
          visibility: ready ? "visible" : "hidden",
        }}
      />
      <span
        style={
          ready
            ? {
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clipPath: "inset(50%)",
              }
            : { position: "absolute", inset: 0, color }
        }
      >
        {text}
      </span>
    </span>
  );
}
export { MinecraftDocumentText, documentTextWidth };
