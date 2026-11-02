"use client";

import * as React from "react";

import { disclosureAdvance } from "./minecraft-disclosure-metrics";
import { minecraftGlyphs } from "./minecraft-font";
import { labelUnihexAtlas } from "./minecraft-label-atlas";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-label.css";

const advance = (char: string) =>
  minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  disclosureAdvance(char) ??
  6;

const textWidth = (text: string) =>
  Math.ceil([...text].reduce((width, char) => width + advance(char), 0));

const splitLines = function splitLines(text: string, width?: number) {
  const lines: string[] = [];

  for (let remaining of text.split("\n")) {
    while (
      width !== null &&
      width !== undefined &&
      textWidth(remaining) > width
    ) {
      const chars = [...remaining];

      let count = 0;
      let used = 0;
      let space = -1;

      while (count < chars.length) {
        if (chars[count] === " ") {
          space = count;
        }

        if (used + advance(chars[count]) > width && count > 0) {
          break;
        }

        const currentCharacter = chars[count];
        count += 1;
        used += advance(currentCharacter);
      }

      const end = space < 0 ? Math.max(1, count) : space;
      lines.push(chars.slice(0, end).join(""));
      remaining = chars.slice(end + Number(space >= 0)).join("");
    }

    lines.push(remaining);
  }

  return lines;
};

type CollapsibleTextProps = React.ComponentProps<"div"> & {
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
};

const MinecraftCollapsibleText = ({
  children,
  className,
  scale = 2,
  maxWidth,
  align = "left",
  style,
  ref,
  ...props
}: CollapsibleTextProps) => {
  const node = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => node.current!, []);
  const [fontReady, setFontReady] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState<number>();

  const text = isMinecraftTextContent(children) ? String(children) : null;

  const unicode = text != null && /[^\u0000-\u007F]/u.test(text);
  React.useLayoutEffect(() => {
    if (unicode) {
      let live = true;
      void loadUnihex().then(() => {
        if (live) {
          setFontReady(true);
        }
      });

      return () => {
        live = false;
      };
    }
  }, [unicode]);
  React.useLayoutEffect(() => {
    const element = node.current!;

    const update = () => {
      const width = Math.floor(element.clientWidth / scale);

      if (width > 0) {
        setContainerWidth(width);
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  const supported =
    text != null &&
    (!unicode || fontReady) &&
    [...text].every(
      (char) =>
        char === "\n" || /^[\u0020-\u007E]$/u.test(char) || getUnihexGlyph(char)
    );

  const lines = text == null ? [] : splitLines(text, maxWidth);
  const widest = Math.max(0, ...lines.map(textWidth));
  const width = containerWidth ?? maxWidth ?? widest;

  return (
    <div
      ref={node}
      data-slot="label"
      data-mc-label-layout-ready={!unicode || fontReady}
      className={cn(`mc-label`, className)}
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
      {text == null ? (
        children
      ) : (
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
              {/^[\u0020-\u007e]*$/u.test(line) ? (
                <MinecraftText>{line}</MinecraftText>
              ) : supported ? (
                <MinecraftUnicodeLabel text={line} atlas={labelUnihexAtlas} />
              ) : (
                line
              )}
            </span>
          ))}
          <span className="mc-text-accessible">{text}</span>
        </>
      )}
    </div>
  );
};

export { MinecraftCollapsibleText };

export type { CollapsibleTextProps };
