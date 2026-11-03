"use client";

import * as React from "react";

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

const hasSupportedParagraphGlyphs = function hasSupportedParagraphGlyphs(
  text: string
) {
  for (const character of text) {
    if (
      !(
        character === "\n" ||
        /^[\u0020-\u007E]$/u.test(character) ||
        getUnihexGlyph(character) !== undefined
      )
    ) {
      return false;
    }
  }

  return true;
};

interface MinecraftDisclosureTextLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-minecraft-disclosure-text-1-padding-left": number;
}

interface MinecraftDisclosureTextScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const advance = (char: string) =>
  minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  6;

const textWidth = (text: string) => {
  let measuredGlyphWidth = 0;

  for (const glyphCharacter of text) {
    measuredGlyphWidth += advance(glyphCharacter);
  }

  return Math.ceil(measuredGlyphWidth);
};

const splitLines = function splitLines(text: string, width?: number) {
  const lines: string[] = [];

  for (let remaining of text.split("\n")) {
    while (
      width !== null &&
      width !== undefined &&
      textWidth(remaining) > width
    ) {
      let count = 0;
      let used = 0;
      let space = -1;
      let consumedOffset = 0;
      let firstCharacterEnd = 0;
      let lastSpaceOffset = -1;
      let nextAfterSpace = -1;

      for (const currentCharacter of remaining) {
        if (count === 0) {
          firstCharacterEnd = currentCharacter.length;
        }

        if (currentCharacter === " ") {
          space = count;
          lastSpaceOffset = consumedOffset;
          nextAfterSpace = consumedOffset + currentCharacter.length;
        }

        if (used + advance(currentCharacter) > width && count > 0) {
          break;
        }

        count += 1;
        used += advance(currentCharacter);
        consumedOffset += currentCharacter.length;
      }

      const end =
        space < 0
          ? Math.max(firstCharacterEnd, consumedOffset)
          : lastSpaceOffset;

      lines.push(remaining.slice(0, end));
      remaining = remaining.slice(space >= 0 ? nextAfterSpace : end);
    }

    lines.push(remaining);
  }

  return lines;
};

type DisclosureTextProps = React.ComponentProps<"div"> & {
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
};

const MinecraftDisclosureText = ({
  children,
  className,
  scale = 2,
  maxWidth,
  align = "left",
  style,
  ref,
  ...props
}: DisclosureTextProps) => {
  const node = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => node.current!, []);
  const [fontReady, setFontReady] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState<number>();

  const text = isMinecraftTextContent(children) ? String(children) : null;

  const unicode = text !== null && /\P{ASCII}/u.test(text);
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
      setContainerWidth(Math.floor(element.clientWidth / scale));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  const supported =
    text !== null &&
    (!unicode || fontReady) &&
    hasSupportedParagraphGlyphs(text);

  const lines = supported ? splitLines(text, maxWidth) : [];
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
        (__style): MinecraftDisclosureTextScaleStyle => ({
          "--mc-scale": scale,
          width:
            typeof maxWidth === "undefined" || maxWidth === null
              ? undefined
              : maxWidth * scale,
          ...__style,
        })
      )}
      {...props}
    >
      {supported ? (
        <>
          {lines.map((line, index) => (
            <span
              aria-hidden="true"
              className="mc-label-line mc-dynamic-layout-minecraft-disclosure-text-1"
              key={index}
              style={
                /* SAFETY: The owned mc-dynamic-layout-minecraft-disclosure-text-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                {
                  "--mc-dynamic-minecraft-disclosure-text-1-padding-left":
                    align === "center"
                      ? (Math.floor((width - widest) / 2) +
                          Math.floor(widest / 2) -
                          Math.floor(textWidth(line) / 2)) *
                        scale
                      : 0,
                } satisfies MinecraftDisclosureTextLayoutStyle1 as MinecraftDisclosureTextLayoutStyle1
              }
            >
              {/^[\u0020-\u007E]*$/u.test(line) ? (
                <MinecraftText>{line}</MinecraftText>
              ) : (
                <MinecraftUnicodeLabel text={line} atlas={labelUnihexAtlas} />
              )}
            </span>
          ))}
          <span className="mc-text-accessible">{text}</span>
        </>
      ) : (
        children
      )}
    </div>
  );
};

export { MinecraftDisclosureText };

export type { DisclosureTextProps };
