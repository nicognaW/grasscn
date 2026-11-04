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

interface MinecraftDisclosureTextLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-minecraft-disclosure-text-1-padding-left": number;
}

interface MinecraftDisclosureTextScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-disclosure-text-max-width"?: string;
}

const advance = (char: string) =>
  minecraftGlyphs[
    // SAFETY: Private glyph callers supply nonempty iteration characters or guarded in-bounds code units. Its first code point therefore exists.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The verified glyph-character producer proves this specific codePointAt(0) result.
    (char.codePointAt(0) as number) - 32
  ]?.[2] ??
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
    if (width !== null && width !== undefined) {
      while (textWidth(remaining) > width) {
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
    const element =
      // SAFETY: React attaches this always-rendered <div> before layout effect setup. Its private ref has one attachment and no other writer; the public ref is removed from the trailing props spread.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The owned intrinsic commit proves this exact HTMLDivElement capture.
      node.current as HTMLDivElement;

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

  const boundedLayout: NativeTextWidthLayout =
    maxWidth === undefined || maxWidth === null
      ? {}
      : {
          className: "w-(--mc-disclosure-text-max-width)",
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
        (__style): MinecraftDisclosureTextScaleStyle => ({
          "--mc-disclosure-text-max-width": boundedLayout.width,
          "--mc-scale": scale,
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
