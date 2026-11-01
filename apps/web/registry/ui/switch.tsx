"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import * as React from "react";

import {
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { MinecraftText } from "./minecraft-text";

import "./minecraft-button.css";
import "./minecraft-switch.css";

type SwitchProps = MinecraftProps<typeof SwitchPrimitive.Root> & {
  scale?: 1 | 2 | 3;
  size?: "default";
};

const Switch = ({
  className,
  scale = 2,
  size = "default",
  style,
  children,
  render,
  disabled,
  onClick,
  onPointerDown,
  ...props
}: SwitchProps) => {
  if (size !== "default") {
    throw new Error(
      "Minecraft on/off buttons support the default visual size only"
    );
  }

  const child = null;

  const artwork = (
    <>
      <span className="mc-button-surface" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </span>
      <span className="mc-button-label" aria-hidden="true">
        <span className="mc-switch-on">
          <MinecraftText>ON</MinecraftText>
        </span>
        <span className="mc-switch-off">
          <MinecraftText>OFF</MinecraftText>
        </span>
      </span>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="mc-switch-thumb"
        aria-hidden="true"
      />
    </>
  );

  return (
    <SwitchPrimitive.Root
      render={render}
      data-slot="switch"
      data-size={size}
      disabled={disabled}
      className={cn(`mc-button mc-switch`, className)}
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
      <>
        {children}
        {artwork}
      </>
    </SwitchPrimitive.Root>
  );
};

export { Switch };

export type { SwitchProps };
