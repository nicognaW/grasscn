"use client";
import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { labelUnihexAtlas } from "./minecraft-label-atlas";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import {
  MinecraftRender,
  type MinecraftProps,
  type MinecraftRenderProp,
} from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-label.css";
const advance = (char: string) =>
  minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  6;
const textWidth = (text: string) =>
  Math.ceil(Array.from(text).reduce((width, char) => width + advance(char), 0));
function splitLines(text: string, width?: number) {
  const lines: string[] = [];
  for (let remaining of text.split("\n")) {
    while (width != null && textWidth(remaining) > width) {
      const chars = Array.from(remaining);
      let used = 0,
        count = 0,
        space = -1;
      while (count < chars.length) {
        if (chars[count] === " ") space = count;
        if (used + advance(chars[count]) > width && count > 0) break;
        used += advance(chars[count++]);
      }
      const end = space < 0 ? Math.max(1, count) : space;
      lines.push(chars.slice(0, end).join(""));
      remaining = chars.slice(end + Number(space >= 0)).join("");
    }
    lines.push(remaining);
  }
  return lines;
}
type MinecraftProseProps = React.HTMLAttributes<HTMLElement> & {
  render?: MinecraftRenderProp;
  ref?: React.Ref<HTMLElement>;
  as?: keyof React.JSX.IntrinsicElements;
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
};
function MinecraftProse({
  children,
  className,
  scale = 2,
  maxWidth,
  align = "left",
  as = "span",
  render,
  style,
  ref,
  ...props
}: MinecraftProseProps) {
  const node = React.useRef<HTMLElement>(null);
  React.useImperativeHandle(ref, () => node.current!, []);
  const [fontReady, setFontReady] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState<number>();
  const child = null;
  const content = children;
  const text =
    typeof content === "string" || typeof content === "number"
      ? String(content)
      : null;
  const unicode = text != null && /[^\x00-\x7f]/.test(text);
  React.useLayoutEffect(() => {
    if (unicode) {
      let live = true;
      loadUnihex().then(() => {
        if (live) setFontReady(true);
      });
      return () => {
        live = false;
      };
    }
  }, [unicode]);
  React.useLayoutEffect(() => {
    const element = node.current!;
    const update = () =>
      setContainerWidth(Math.floor(element.clientWidth / scale));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scale]);
  const supported =
    text != null &&
    (!unicode || fontReady) &&
    Array.from(text).every(
      (char) =>
        char === "\n" || /^[\x20-\x7e]$/.test(char) || getUnihexGlyph(char)
    );
  const lines = supported ? splitLines(text, maxWidth) : [];
  const widest = Math.max(0, ...lines.map(textWidth));
  const width = containerWidth ?? maxWidth ?? widest;
  const rendered = supported ? (
    <>
      {lines.map((line, index) => (
        <span
          aria-hidden="true"
          className="mc-label-line"
          key={index}
          style={{
            paddingLeft:
              align === "center"
                ? (Math.floor((width - widest) / 2) +
                    Math.floor(widest / 2) -
                    Math.floor(textWidth(line) / 2)) *
                  scale
                : 0,
          }}
        >
          {/^[\x20-\x7e]*$/.test(line) ? (
            <MinecraftText>{line}</MinecraftText>
          ) : (
            <MinecraftUnicodeLabel text={line} atlas={labelUnihexAtlas} />
          )}
        </span>
      ))}
      <span className="mc-text-accessible">{text}</span>
    </>
  ) : (
    content
  );
  const Component = MinecraftRender;
  return (
    <Component
      as={as}
      render={render}
      ref={node}
      data-slot="minecraft-prose"
      data-mc-label-layout-ready={!unicode || fontReady}
      className={cn(`mc-label ${""}`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({
            "--mc-scale": scale,
            width: maxWidth == null ? undefined : maxWidth * scale,
            ...__style,
          }) as React.CSSProperties
      )}
      {...props}
    >
      {rendered}
    </Component>
  );
}
export { MinecraftProse };
export type { MinecraftProseProps };
