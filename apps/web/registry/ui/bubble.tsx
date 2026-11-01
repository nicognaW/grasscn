"use client";

import * as React from "react";

import { MessageScale, MessageAuthor, isChatInline } from "./message";

import "./minecraft-bubble.css";
import { MinecraftChatText } from "./minecraft-chat-text";
import { disclosureAdvance } from "./minecraft-disclosure-metrics";
import { minecraftGlyphs } from "./minecraft-font";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type {
  MinecraftProps,
  MinecraftPolymorphicProps,
} from "./minecraft-render";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

const BubbleGroup = ({
  className,
  scale: providedScale,
  style,
  ...props
}: MinecraftProps<"div"> & {
  scale?: 1 | 2 | 3;
}) => {
  const inherited = React.useContext(MessageScale);
  const scale = providedScale ?? inherited;

  return (
    <MessageScale value={scale}>
      <div
        data-slot="bubble-group"
        className={cn(`mc-bubble-group`, className)}
        style={minecraftStyle(
          style,
          (__style) =>
            ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
        )}
        {...props}
      />
    </MessageScale>
  );
};

type BubbleProps = MinecraftProps<"div"> & {
  variant?: "default";
  align?: "start" | "end";
  scale?: 1 | 2 | 3;
  from?: "user" | "assistant" | "system";
  author?: string;
};

const Bubble = ({
  variant = "default",
  align = "start",
  scale: providedScale,
  from,
  author: providedAuthor,
  className,
  style,
  ...props
}: BubbleProps) => {
  const inherited = React.useContext(MessageScale);
  const scale = providedScale ?? inherited;

  const author =
    providedAuthor ??
    (from === "user"
      ? "Player"
      : from === "assistant"
        ? "Assistant"
        : undefined);

  if (variant !== "default") {
    throw new Error("Minecraft chat supports the default backdrop only");
  }

  return (
    <MessageScale value={scale}>
      <MessageAuthor value={author}>
        <div
          data-slot="bubble"
          data-variant={variant}
          data-align={align}
          data-from={from}
          data-author={author}
          className={cn(`mc-bubble`, className)}
          style={minecraftStyle(
            style,
            (__style) =>
              ({
                "--mc-scale": scale,
                ...(from === "system" ? { color: "#ffff55" } : {}),
                ...__style,
              }) as React.CSSProperties
          )}
          {...props}
        />
      </MessageAuthor>
    </MessageScale>
  );
};

const BubbleContent = ({
  render,
  className,
  children,
  ref,
  ...props
}: MinecraftPolymorphicProps<"div"> & {}) => {
  const scale = React.useContext(MessageScale);
  const author = React.useContext(MessageAuthor);
  const node = React.useRef<HTMLElement>(null);
  const [available, setAvailable] = React.useState<number>();
  const [fontReady, setFontReady] = React.useState(false);

  React.useImperativeHandle(ref, () => node.current! as HTMLDivElement, []);
  React.useLayoutEffect(() => {
    const element = node.current!;
    const bubble = element.closest<HTMLElement>("[data-slot=bubble]");
    const parent = bubble?.parentElement ?? element.parentElement!;

    const update = () => {
      const ownStyle = getComputedStyle(element);
      const parentStyle = getComputedStyle(parent);
      const fixed = element.style.width && element.style.width !== "auto";

      let pixels = fixed
        ? element.clientWidth
        : parent.clientWidth -
          Number.parseFloat(parentStyle.paddingLeft) -
          Number.parseFloat(parentStyle.paddingRight);

      if (bubble) {
        const maximum = getComputedStyle(bubble).maxWidth;

        if (maximum.endsWith("px")) {
          pixels = Math.min(pixels, parseFloat(maximum));
        }

        if (bubble.style.width && bubble.style.width !== "auto") {
          pixels = Math.min(pixels, bubble.clientWidth);
        }
      }

      setAvailable(
        Math.max(
          1,
          Math.floor(
            (pixels -
              Number.parseFloat(ownStyle.paddingLeft) -
              Number.parseFloat(ownStyle.paddingRight)) /
              scale
          )
        )
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  const original = children;

  const content =
    author && isMinecraftTextContent(original)
      ? `<${author}> ${original}`
      : original;

  const plainText = (value: React.ReactNode): string =>
    isMinecraftTextContent(value)
      ? String(value)
      : Array.isArray(value)
        ? value.map(plainText).join("")
        : React.isValidElement<{
              children?: React.ReactNode;
            }>(value)
          ? plainText(value.props.children)
          : "";

  const text = plainText(content);
  const unicode = /[^\u0000-\u007F]/u.test(text);

  React.useLayoutEffect(() => {
    let live = true;
    setFontReady(!unicode);

    if (unicode) {
      void loadUnihex().then(() => {
        if (live) setFontReady(true);
      });
    }

    return () => {
      live = false;
    };
  }, [text, unicode]);

  const naturalWidth = Math.max(
    0,
    ...text
      .split("\n")
      .map((line) =>
        Math.ceil(
          [...line].reduce(
            (sum, char) =>
              sum +
              (minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
                getUnihexGlyph(char)?.advance ??
                disclosureAdvance(char) ??
                6),
            0
          )
        )
      )
  );

  const width = Math.min(naturalWidth, available ?? naturalWidth);

  const rendered = isChatInline(content) ? (
    <MinecraftChatText
      scale={scale}
      maxWidth={width}
      style={{ color: "inherit" }}
    >
      {content}
    </MinecraftChatText>
  ) : (
    content
  );

  const Comp = MinecraftRender;

  return (
    <Comp
      render={render}
      as="div"
      ref={node as React.Ref<HTMLDivElement>}
      data-slot="bubble-content"
      data-mc-chat-ready={
        available != null && (!unicode || fontReady) ? "true" : "false"
      }
      className={cn(`mc-bubble-content`, className)}
      {...props}
    >
      {rendered}
    </Comp>
  );
};

const BubbleReactions = ({
  side = "bottom",
  align = "end",
  className,
  ...props
}: MinecraftProps<"div"> & {
  side?: "top" | "bottom";
  align?: "start" | "end";
}) => {
  return (
    <div
      data-slot="bubble-reactions"
      data-side={side}
      data-align={align}
      className={cn(`mc-bubble-reactions`, className)}
      {...props}
    />
  );
};

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions };

export type { BubbleProps };
