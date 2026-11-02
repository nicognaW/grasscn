"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import * as React from "react";

import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { toggleVariants } from "./toggle";

import "./minecraft-toggle-group.css";

interface ToggleGroupSpacingStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-toggle-spacing": number;
}

interface ToggleGroupScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

interface Appearance {
  scale?: 1 | 2 | 3;
  variant?: "default";
  size?: "default";
}

type ToggleGroupProps = MinecraftProps<typeof ToggleGroupPrimitive> &
  Appearance & {
    spacing?: number;
  };

type ToggleGroupItemProps = MinecraftProps<typeof TogglePrimitive> & Appearance;

const AppearanceContext = React.createContext<
  Appearance & {
    disabled?: boolean;
  }
>({ scale: 2, size: "default", variant: "default" });

const ToggleGroup = ({
  scale = 2,
  variant = "default",
  size = "default",
  spacing = 2,
  className,
  style,
  children,
  disabled,
  ...props
}: ToggleGroupProps) => {
  if (variant !== "default" || size !== "default") {
    throw new Error(
      "Minecraft recipe filters support the default visual variant and size only"
    );
  }

  return (
    <AppearanceContext.Provider value={{ disabled, scale, size, variant }}>
      <ToggleGroupPrimitive
        data-slot="toggle-group"
        disabled={disabled}
        className={cn(`mc-toggle-group`, className)}
        style={minecraftStyle(
          style,
          (__style): ToggleGroupSpacingStyle =>
            ({
              "--mc-scale": scale,
              "--mc-toggle-spacing": spacing,
              ...__style,
            })
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive>
    </AppearanceContext.Provider>
  );
};

const ToggleGroupItem = ({
  scale,
  variant,
  size,
  className,
  style,
  disabled,
  onClick,
  onPointerDown,
  ...props
}: ToggleGroupItemProps) => {
  const inherited = React.useContext(AppearanceContext);
  const resolvedScale = scale ?? inherited.scale;
  const resolvedVariant = variant ?? inherited.variant ?? "default";
  const resolvedSize = size ?? inherited.size ?? "default";
  const resolvedDisabled = disabled ?? inherited.disabled;

  if (resolvedVariant !== "default" || resolvedSize !== "default") {
    throw new Error(
      "Minecraft recipe filters support the default visual variant and size only"
    );
  }

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      disabled={resolvedDisabled}
      className={cn(
        toggleVariants({ size: resolvedSize, variant: resolvedVariant }),
        className
      )}
      style={minecraftStyle(
        style,
        (__style): ToggleGroupScaleStyle =>
          ({ "--mc-scale": resolvedScale, ...__style })
      )}
      {...props}
      aria-disabled={
        (resolvedDisabled ?? false) ? true : props["aria-disabled"]
      }
      onPointerDown={(event) => {
        if (
          (resolvedDisabled ?? false) ||
          Object.hasOwn(event.currentTarget.dataset, "disabled")
        ) {
          event.preventDefault();

          return;
        }

        onPointerDown?.(event);
      }}
      onClick={(event) => {
        if (
          (resolvedDisabled ?? false) ||
          Object.hasOwn(event.currentTarget.dataset, "disabled") ||
          event.currentTarget.getAttribute("aria-disabled") === "true"
        ) {
          event.preventDefault();

          return;
        }

        onClick?.(event);

        if (
          !event.defaultPrevented &&
          !(event.baseUIHandlerPrevented ?? false)
        ) {
          playMinecraftClick();
        }
      }}
    />
  );
};

export { ToggleGroup, ToggleGroupItem };

export type { ToggleGroupProps, ToggleGroupItemProps };
