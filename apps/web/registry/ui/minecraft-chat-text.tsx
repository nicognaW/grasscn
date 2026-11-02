"use client";

import * as React from "react";

import { minecraftChatAtlas } from "./minecraft-chat-atlas";
import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { disclosureAdvance } from "./minecraft-disclosure-metrics";
import { minecraftGlyphs } from "./minecraft-font";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type { MinecraftRenderProp } from "./minecraft-render";
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

type MinecraftChatTextProps = React.HTMLAttributes<HTMLElement> & {
  render?: MinecraftRenderProp;
  ref?: React.Ref<HTMLElement>;
  as?: keyof React.JSX.IntrinsicElements;
  clipWidth?: number;
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
};

const MinecraftChatText = ({
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
}: MinecraftChatTextProps) => {
  const node = React.useRef<HTMLElement>(null);
  React.useImperativeHandle(ref, () => node.current!, []);
  const [fontReady, setFontReady] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState<number>();

  const content = children;

  const accessibleText = isMinecraftTextContent(content)
    ? String(content)
    : null;

  let text = accessibleText;

  if (text !== null && (typeof clipWidth !== "undefined" && clipWidth !== null) && clipWidth > 0) {
    text = text
      .split("\n")
      .map((line) => {
        if (textWidth(line) <= clipWidth) {
          return line;
        }

        let value = "";
        let used = 0;

        for (const char of Array.from(line)) {
          const next = advance(char);

          if (used + next > clipWidth - textWidth("...")) {
            break;
          }

          value += char;
          used += next;
        }

        return value + "...";
      })
      .join("\n");
  }

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
    [...text].every(
      (char) =>
        char === "\n" || /^[\u0020-\u007E]$/u.test(char) || getUnihexGlyph(char)
    );

  const lines = text === null ? [] : splitLines(text, maxWidth);
  const widest = Math.max(0, ...lines.map(textWidth));
  const width = containerWidth ?? maxWidth ?? widest;

  const richText = (value: React.ReactNode): React.ReactNode => {
    if (isMinecraftTextContent(value)) {
      return (
        <MinecraftChatText
          scale={scale}
          style={{ color: "inherit", textShadow: "inherit" }}
        >
          {value}
        </MinecraftChatText>
      );
    }

    if (Array.isArray(value)) {
      return value.map((child, index) => (
        <React.Fragment key={index}>{richText(child)}</React.Fragment>
      ));
    }

    if (
      React.isValidElement<{
        children?: React.ReactNode;
      }>(value) &&
      (value.type === React.Fragment ||
        (typeof value.type === "string" &&
          [
            "span",
            "a",
            "strong",
            "em",
            "b",
            "i",
            "u",
            "s",
            "small",
            "code",
            "mark",
            "abbr",
            "sub",
            "sup",
          ].includes(value.type)))
    ) {
      return React.cloneElement(
        value,
        undefined,
        richText(value.props.children)
      );
    }

    return value;
  };

  const rendered =
    text === null ? (
      accessibleText === null ? (
        <span className="mc-chat-rich-inline">{richText(content)}</span>
      ) : (
        content
      )
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
            {supported ? (
              <MinecraftColorUnicodeLabel
                text={line}
                atlas={minecraftChatAtlas}
              />
            ) : (
              line
            )}
          </span>
        ))}
        <span className="mc-text-accessible">{accessibleText}</span>
      </>
    );

  const Component = MinecraftRender;

  return (
    <Component
      as={as}
      render={render}
      ref={node}
      data-slot="minecraft-prose"
      data-mc-label-layout-ready={!unicode || fontReady}
      className={cn(`mc-label`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({
            "--mc-scale": scale,
            width: (typeof maxWidth === "undefined" || maxWidth === null) ? undefined : maxWidth * scale,
            ...__style,
          }) as React.CSSProperties
      )}
      {...props}
    >
      {rendered}
    </Component>
  );
};

export { MinecraftChatText };

export type { MinecraftChatTextProps };
