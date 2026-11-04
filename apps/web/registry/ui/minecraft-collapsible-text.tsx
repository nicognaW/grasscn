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

interface NativeTextWidthLayout {
  className?: string;
  width?: string;
}

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

interface MinecraftCollapsibleTextLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-minecraft-collapsible-text-1-padding-left": number;
}

interface MinecraftCollapsibleTextScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-collapsible-text-max-width"?: string;
}

const advance = (char: string) =>
  minecraftGlyphs[
    // SAFETY: Private glyph callers supply nonempty iteration characters or guarded in-bounds code units. Its first code point therefore exists.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The verified glyph-character producer proves this specific codePointAt(0) result.
    (char.codePointAt(0) as number) - 32
  ]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  disclosureAdvance(char) ??
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
  React.useImperativeHandle<typeof node.current, typeof node.current>(
    ref,
    () => node.current,
    []
  );
  const [fontReady, setFontReady] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState<number>();

  const text = isMinecraftTextContent(children) ? String(children) : null;

  const unicode = text !== null && /\P{ASCII}/u.test(text);
  React.useLayoutEffect((): (() => void) | undefined => {
    if (unicode) {
      let live = true;
      const fontLoading = loadUnihex();

      const commitFontReadiness = async () => {
        await fontLoading;

        if (live) {
          setFontReady(true);
        }
      };

      void commitFontReadiness();

      return () => {
        live = false;
      };
    }

    return undefined;
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
    text !== null &&
    (!unicode || fontReady) &&
    hasSupportedParagraphGlyphs(text);

  const lines = text === null ? [] : splitLines(text, maxWidth);
  const widest = Math.max(0, ...lines.map(textWidth));
  const width = containerWidth ?? maxWidth ?? widest;

  const boundedLayout: NativeTextWidthLayout =
    maxWidth === undefined || maxWidth === null
      ? {}
      : {
          className: "w-(--mc-collapsible-text-max-width)",
          width: `${maxWidth * scale}px`,
        };

  return (
    <div
      ref={node}
      data-slot="label"
      data-mc-label-layout-ready={!unicode || fontReady}
      className={cn(`mc-label`, boundedLayout.className, className)}
      style={minecraftStyle(
        style,
        (__style): MinecraftCollapsibleTextScaleStyle => ({
          "--mc-collapsible-text-max-width": boundedLayout.width,
          "--mc-scale": scale,
          ...__style,
        })
      )}
      {...props}
    >
      {text === null ? (
        children
      ) : (
        <>
          {lines.map((line, index) => (
            <span
              aria-hidden="true"
              className="mc-label-line mc-dynamic-layout-minecraft-collapsible-text-1"
              key={index}
              style={
                /* SAFETY: The owned mc-dynamic-layout-minecraft-collapsible-text-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                {
                  "--mc-dynamic-minecraft-collapsible-text-1-padding-left":
                    align === "center"
                      ? (Math.floor((width - widest) / 2) +
                          Math.floor(widest / 2) -
                          Math.floor(textWidth(line) / 2)) *
                        scale
                      : 0,
                } satisfies MinecraftCollapsibleTextLayoutStyle1 as MinecraftCollapsibleTextLayoutStyle1
              }
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
