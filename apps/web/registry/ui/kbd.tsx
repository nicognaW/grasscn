"use client";
import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";

import "./minecraft-button.css";
import "./minecraft-kbd.css";
function keyText(content: React.ReactNode): React.ReactNode {
  if (Array.isArray(content))
    return content.map((child, index) => (
      <React.Fragment key={index}>{keyText(child)}</React.Fragment>
    ));
  if (typeof content !== "string" && typeof content !== "number")
    return content;
  const text = String(content);
  if (!/^[\x20-\x7e]*$/.test(text))
    return <MinecraftUnicodeLabel text={text} />;
  return (
    <span className="mc-text">
      <span className="mc-text-pixels" aria-hidden="true">
        {Array.from(text, (char, index) => {
          const [x, y, advance] = minecraftGlyphs[char.charCodeAt(0) - 32];
          return (
            <span
              key={index}
              className="mc-glyph"
              style={
                {
                  "--mc-glyph-x": x,
                  "--mc-glyph-y": y,
                  "--mc-advance": advance,
                  visibility: char === " " ? "hidden" : undefined,
                } as React.CSSProperties
              }
            />
          );
        })}
      </span>
      <span className="mc-text-accessible">{text}</span>
    </span>
  );
}
type KbdProps = React.ComponentProps<"kbd"> & {
  scale?: 1 | 2 | 3;
};
function Kbd({ children, className, scale = 2, style, ...props }: KbdProps) {
  const label = React.useRef<HTMLSpanElement>(null),
    [inkWidth, setInkWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const element = label.current!;
    const measure = () =>
      setInkWidth(Math.ceil(element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, scale]);
  return (
    <kbd
      data-slot="kbd"
      className={cn(`mc-button mc-kbd ${""}`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
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
}
function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn(`mc-kbd-group ${""}`, className)}
      {...props}
    />
  );
}
export { Kbd, KbdGroup };
export type { KbdProps };
