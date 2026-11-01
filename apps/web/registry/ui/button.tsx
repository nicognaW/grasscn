"use client";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
// Primitive composition: shadcn-ui/ui apps/v4/registry/bases/base/ui/button.tsx (MIT).
import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-button.css";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
function bitmapText(content: React.ReactNode): React.ReactNode {
  if (
    Array.isArray(content) ||
    (React.isValidElement(content) && content.type === React.Fragment)
  ) {
    const parts: React.ReactNode[] = [];
    let run = "";
    const flush = () => {
      if (run) {
        parts.push(run);
        run = "";
      }
    };
    const visit = (child: React.ReactNode) => {
      if (child == null || typeof child === "boolean") return;
      if (Array.isArray(child)) {
        child.forEach(visit);
        return;
      }
      if (
        React.isValidElement<{
          children?: React.ReactNode;
        }>(child) &&
        child.type === React.Fragment
      ) {
        visit(child.props.children);
        return;
      }
      if (
        typeof child === "string" ||
        typeof child === "number" ||
        typeof child === "bigint"
      )
        run += String(child);
      else {
        flush();
        parts.push(child);
      }
    };
    visit(content);
    flush();
    return parts.map((child, index) => (
      <React.Fragment key={index}>{bitmapText(child)}</React.Fragment>
    ));
  }
  if (
    typeof content !== "string" &&
    typeof content !== "number" &&
    typeof content !== "bigint"
  )
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
const buttonVariants = cva(
  "mc-button relative inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "",
      },
      size: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
function Button({
  className,
  variant = "default",
  size = "default",
  render,
  scale = 2,
  style,
  children,
  onClick,
  ...props
}: MinecraftProps<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants> & {
    scale?: 1 | 2 | 3;
  }) {
  const Comp = ButtonPrimitive;
  const skin = (content: React.ReactNode) => (
    <>
      <span className="mc-button-surface" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </span>
      <span className="mc-button-label">{bitmapText(content)}</span>
    </>
  );
  const content = skin(children);
  return (
    <Comp
      render={render}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(cn(buttonVariants({ variant, size }), className))}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          !props.disabled &&
          !event.currentTarget.hasAttribute("data-disabled")
        )
          playMinecraftClick();
      }}
    >
      {content}
    </Comp>
  );
}
export { Button, buttonVariants };
