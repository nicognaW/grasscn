"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";

import "./minecraft-toggle-assets.css";
import { playMinecraftClick } from "./minecraft-sound";

import "./minecraft-toggle.css";

const toggleVariants = cva("mc-toggle", {
  defaultVariants: { size: "default", variant: "default" },
  variants: { size: { default: "" }, variant: { default: "" } },
});

type ToggleProps = MinecraftProps<typeof TogglePrimitive> &
  VariantProps<typeof toggleVariants> & {
    scale?: 1 | 2 | 3;
  };

const Toggle = ({
  className,
  variant = "default",
  size = "default",
  scale = 2,
  style,
  children,
  render,
  disabled,
  onClick,
  onPointerDown,
  ...props
}: ToggleProps) => {
  if (variant !== "default" || size !== "default") {
    throw new Error(
      "Minecraft recipe filters support the default visual variant and size only"
    );
  }

  return (
    <TogglePrimitive
      render={render}
      data-slot="toggle"
      disabled={disabled}
      className={cn(toggleVariants({ size, variant }), className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
      aria-disabled={disabled ? true : props["aria-disabled"]}
      onPointerDown={(event) => {
        if (disabled) {
          event.preventDefault();

          return;
        }

        onPointerDown?.(event);
      }}
      onClick={(event) => {
        if (
          disabled ||
          Object.hasOwn(event.currentTarget.dataset, "disabled") ||
          event.currentTarget.getAttribute("aria-disabled") === "true"
        ) {
          event.preventDefault();

          return;
        }

        onClick?.(event);

        if (!event.defaultPrevented && !event.baseUIHandlerPrevented) {
          playMinecraftClick();
        }
      }}
    >
      {children}
    </TogglePrimitive>
  );
};

export { Toggle, toggleVariants };

export type { ToggleProps };
