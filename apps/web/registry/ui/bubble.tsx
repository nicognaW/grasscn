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

interface BubbleScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

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
        style={minecraftStyle(style, (__style): BubbleScaleStyle => ({
          "--mc-scale": scale,
          ...__style,
        }))}
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

  let defaultAuthor: string | undefined;

  if (from === "user") {
    defaultAuthor = "Player";
  } else if (from === "assistant") {
    defaultAuthor = "Assistant";
  }

  const author = providedAuthor ?? defaultAuthor;

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
          className={cn(
            "mc-bubble",
            from === "system" && "mc-bubble-system",
            className
          )}
          style={minecraftStyle(style, (__style): BubbleScaleStyle => ({
            "--mc-scale": scale,
            ...__style,
          }))}
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
}: MinecraftPolymorphicProps<"div">) => {
  const scale = React.useContext(MessageScale);
  const author = React.useContext(MessageAuthor);

  const [attached, setAttached] = React.useState<
    (Element & ElementCSSInlineStyle) | null
  >(null);

  const [available, setAvailable] = React.useState<number>();
  const [unihexReady, setUnihexReady] = React.useState(false);

  React.useLayoutEffect((): (() => void) | undefined => {
    const element = attached;

    if (element === null) {
      return undefined;
    }

    const bubble = element.closest<HTMLElement>("[data-slot=bubble]");
    const parent = bubble?.parentElement ?? element.parentElement;

    if (!parent) {
      return undefined;
    }

    const update = () => {
      const ownStyle = getComputedStyle(element);
      const parentStyle = getComputedStyle(parent);

      const fixed =
        element.style.width !== "" && element.style.width !== "auto";

      let pixels = fixed
        ? element.clientWidth
        : parent.clientWidth -
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
          Number.parseFloat(parentStyle.paddingLeft) -
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
          Number.parseFloat(parentStyle.paddingRight);

      if (bubble) {
        const maximum = getComputedStyle(bubble).maxWidth;

        if (maximum.endsWith("px")) {
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
          pixels = Math.min(pixels, Number.parseFloat(maximum));
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
              // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
              Number.parseFloat(ownStyle.paddingLeft) -
              // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
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
  }, [attached, scale]);

  const original = children;

  const content =
    (author ?? "") !== "" && isMinecraftTextContent(original)
      ? `<${author}> ${original}`
      : original;

  const plainText = (value: React.ReactNode): string => {
    if (isMinecraftTextContent(value)) {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map(plainText).join("");
    }

    if (
      React.isValidElement<{
        children?: React.ReactNode;
      }>(value)
    ) {
      return plainText(value.props.children);
    }

    return "";
  };

  const text = plainText(content);
  const unicode = /\P{ASCII}/u.test(text);
  const fontReady = !unicode || unihexReady;

  // Font readiness belongs to the shared Unihex resource, not individual text.
  React.useLayoutEffect(() => {
    let live = true;

    if (unicode) {
      const fontLoading = loadUnihex();

      const commitFontReadiness = async () => {
        await fontLoading;

        if (live) {
          setUnihexReady(true);
        }
      };

      void commitFontReadiness();
    }

    return () => {
      live = false;
    };
  }, [unicode]);

  const naturalWidth = Math.max(
    0,
    ...text.split("\n").map((line) => {
      let accumulatedGlyphAdvance = 0;

      for (const advanceCharacter of line) {
        accumulatedGlyphAdvance +=
          minecraftGlyphs[
            // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
            (advanceCharacter.codePointAt(0) as number) - 32
          ]?.[2] ??
          getUnihexGlyph(advanceCharacter)?.advance ??
          disclosureAdvance(advanceCharacter) ??
          6;
      }

      return Math.ceil(accumulatedGlyphAdvance);
    })
  );

  const width = Math.min(naturalWidth, available ?? naturalWidth);

  const rendered = isChatInline(content) ? (
    <MinecraftChatText
      scale={scale}
      maxWidth={width}
      className="mc-owned-paint-bubble-1"
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
      ref={[setAttached, ref ?? null]}
      data-slot="bubble-content"
      data-mc-chat-ready={
        available !== undefined && fontReady ? "true" : "false"
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
}) => (
  <div
    data-slot="bubble-reactions"
    data-side={side}
    data-align={align}
    className={cn(`mc-bubble-reactions`, className)}
    {...props}
  />
);

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions };

export type { BubbleProps };
