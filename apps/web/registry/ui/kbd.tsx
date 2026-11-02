"use client";

import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";

import "./minecraft-button.css";
import "./minecraft-kbd.css";

interface KbdGlyphStyle extends React.CSSProperties {
  "--mc-advance": number;
  "--mc-glyph-x": number;
  "--mc-glyph-y": number;
}

interface KbdScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const keyText = function keyText(content: React.ReactNode): React.ReactNode {
  if (Array.isArray(content)) {
    return content.map((child, index) => (
      <React.Fragment key={index}>{keyText(child)}</React.Fragment>
    ));
  }

  if (!isMinecraftTextContent(content)) {
    return content;
  }

  const text = String(content);

  if (!/^[\u0020-\u007E]*$/u.test(text)) {
    return <MinecraftUnicodeLabel text={text} />;
  }

  return (
    <span className="mc-text">
      <span className="mc-text-pixels" aria-hidden="true">
        {Array.from(text, (char, index) => {
          const codePoint = char.codePointAt(0);

          if (codePoint === undefined) {
            throw new Error("Expected a non-empty glyph character");
          }

          const [x, y, advance] = minecraftGlyphs[codePoint - 32];

          const glyphStyle: KbdGlyphStyle = {
            "--mc-advance": advance,
            "--mc-glyph-x": x,
            "--mc-glyph-y": y,
            visibility: char === " " ? "hidden" : undefined,
          };

          return <span key={index} className="mc-glyph" style={glyphStyle} />;
        })}
      </span>
      <span className="mc-text-accessible">{text}</span>
    </span>
  );
};

type KbdProps = React.ComponentProps<"kbd"> & {
  scale?: 1 | 2 | 3;
};

const Kbd = ({ children, className, scale = 2, style, ...props }: KbdProps) => {
  const label = React.useRef<HTMLSpanElement>(null);
  const [inkWidth, setInkWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const element = label.current!;

    const measure = () => {
      setInkWidth(Math.ceil(element.getBoundingClientRect().width));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [children, scale]);

  return (
    <kbd
      data-slot="kbd"
      className={cn(`mc-button mc-kbd`, className)}
      style={minecraftStyle(style, (__style): KbdScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    >
      <span className="mc-button-surface" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </span>
      <span
        aria-hidden="true"
        className="mc-kbd-intrinsic"
        style={{ width: inkWidth }}
      />
      <span ref={label} className="mc-button-label">
        {keyText(children)}
      </span>
    </kbd>
  );
};

const KbdGroup = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    data-slot="kbd-group"
    className={cn(`mc-kbd-group`, className)}
    {...props}
  />
);

export { Kbd, KbdGroup };

export type { KbdProps };
