"use client";

import * as React from "react";

import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { minecraftGlyphs } from "./minecraft-font";
import { minecraftItemAtlas } from "./minecraft-item-atlas";
import {
  isMinecraftInlineTextElement,
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type { MinecraftRenderProp } from "./minecraft-render";
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

interface MinecraftItemTextLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-minecraft-item-text-1-padding-left": number;
}

interface NativeTextWidthLayout {
  className?: string;
  width?: string;
}

interface MinecraftItemTextScaleStyle extends React.CSSProperties {
  "--mc-prose-max-width"?: string;
  "--mc-scale": number;
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

/** Measure glyph lines and resolve their measured, configured and native width bounds. */
const measureItemTextLayout = function measureItemTextLayout(
  lines: readonly string[],
  containerWidth: number | undefined,
  maxWidth: number | null | undefined,
  scale: number
) {
  const widest = Math.max(0, ...lines.map(textWidth));
  const width = containerWidth ?? maxWidth ?? widest;

  const boundedLayout: NativeTextWidthLayout =
    maxWidth === undefined || maxWidth === null
      ? {}
      : {
          className: "w-(--mc-prose-max-width)",
          width: `${maxWidth * scale}px`,
        };

  return { boundedLayout, widest, width };
};

type MinecraftItemTextProps = React.HTMLAttributes<HTMLElement> & {
  render?: MinecraftRenderProp;
  ref?: React.Ref<HTMLElement>;
  as?: keyof React.JSX.IntrinsicElements;
  clipWidth?: number;
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
};

const MinecraftItemText = ({
  children,
  className,
  scale = 2,
  maxWidth,
  align = "left",
  as = "span",
  render,
  clipWidth,
  style,
  ref,
  ...props
}: MinecraftItemTextProps) => {
  const node = React.useRef<HTMLElement>(null);

  const [attached, setAttached] = React.useState<HTMLElement | null>(null);

  const captureNode = React.useCallback((element: HTMLElement | null) => {
    node.current = element;

    setAttached(element);
  }, []);

  React.useImperativeHandle<typeof node.current, typeof node.current>(
    ref,
    () => node.current,
    []
  );
  const [fontReady, setFontReady] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState<number>();

  const content = children;

  const accessibleText = isMinecraftTextContent(content)
    ? String(content)
    : null;

  let text = accessibleText;

  if (
    text !== null &&
    clipWidth !== undefined &&
    clipWidth !== null &&
    clipWidth > 0
  ) {
    text = text
      .split("\n")
      .map((line) => {
        if (textWidth(line) <= clipWidth) {
          return line;
        }

        let value = "";
        let used = 0;

        for (const char of line) {
          const next = advance(char);

          if (used + next > clipWidth - textWidth("...")) {
            break;
          }

          value += char;
          used += next;
        }

        return `${value}...`;
      })
      .join("\n");
  }

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
    const element = attached;
    let observer: ResizeObserver | undefined;

    if (element !== null) {
      const update = () => {
        setContainerWidth(Math.floor(element.clientWidth / scale));
      };

      update();
      observer = new ResizeObserver(update);
      observer.observe(element);
    }

    return () => {
      observer?.disconnect();
    };
  }, [attached, scale]);

  const supported =
    text !== null &&
    (!unicode || fontReady) &&
    hasSupportedParagraphGlyphs(text);

  const lines = supported && text !== null ? splitLines(text, maxWidth) : [];

  const { boundedLayout, widest, width } = measureItemTextLayout(
    lines,
    containerWidth,
    maxWidth,
    scale
  );

  const richText = (value: React.ReactNode): React.ReactNode => {
    if (isMinecraftTextContent(value)) {
      return (
        <MinecraftItemText
          scale={scale}
          className="text-inherit [text-shadow:inherit]"
        >
          {value}
        </MinecraftItemText>
      );
    }

    if (Array.isArray(value)) {
      // oxlint-disable-next-line react/no-react-children -- This recursive renderer adapts opaque ReactNode children; React owns supplied-key composition and nested sibling scopes. Preserve the public children ABI without fabricating IDs or reimplementing key escaping.
      return React.Children.map(value, richText);
    }

    if (isMinecraftInlineTextElement(value)) {
      // oxlint-disable-next-line react/no-clone-element -- This whitelist-owned inline text adaptation changes children only, retaining the caller element type, key, ref and other props; rebuilding elements or adding wrappers changes rich-child identity/composition.
      return React.cloneElement(
        value,
        undefined,
        richText(value.props.children)
      );
    }

    return value;
  };

  let _selectedRendered: React.ReactNode;

  if (supported) {
    _selectedRendered = (
      <>
        {lines.map((line, index) => (
          <span
            aria-hidden="true"
            className="mc-label-line mc-dynamic-layout-minecraft-item-text-1"
            key={index}
            style={
              /* SAFETY: The owned mc-dynamic-layout-minecraft-item-text-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-minecraft-item-text-1-padding-left":
                  align === "center"
                    ? (Math.floor((width - widest) / 2) +
                        Math.floor(widest / 2) -
                        Math.floor(textWidth(line) / 2)) *
                      scale
                    : 0,
              } satisfies MinecraftItemTextLayoutStyle1 as MinecraftItemTextLayoutStyle1
            }
          >
            <MinecraftColorUnicodeLabel
              text={line}
              atlas={minecraftItemAtlas}
            />
          </span>
        ))}
        <span className="mc-text-accessible">{accessibleText}</span>
      </>
    );
  } else if (accessibleText === null) {
    _selectedRendered = <span>{richText(content)}</span>;
  } else {
    _selectedRendered = content;
  }

  const rendered = _selectedRendered;

  const Component = MinecraftRender;

  return (
    <Component
      as={as}
      render={render}
      ref={captureNode}
      data-slot="minecraft-prose"
      data-mc-label-layout-ready={!unicode || fontReady}
      className={cn(`mc-label`, boundedLayout.className, className)}
      style={minecraftStyle(style, (__style): MinecraftItemTextScaleStyle => ({
        "--mc-prose-max-width": boundedLayout.width,
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    >
      {rendered}
    </Component>
  );
};

export { MinecraftItemText };

export type { MinecraftItemTextProps };
