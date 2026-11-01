"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import {
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type {
  MinecraftProps,
  MinecraftPolymorphicProps,
} from "./minecraft-render";
import { Separator } from "./separator";

import "./minecraft-button-group.css";

const buttonGroupVariants = cva("mc-button-group", {
  defaultVariants: { orientation: "horizontal" },
  variants: {
    orientation: {
      horizontal: "mc-button-group-horizontal",
      vertical: "mc-button-group-vertical",
    },
  },
});

const ButtonGroup = ({
  className,
  orientation = "horizontal",
  scale = 2,
  style,
  ...props
}: MinecraftProps<"div"> &
  VariantProps<typeof buttonGroupVariants> & {
    scale?: 1 | 2 | 3;
  }) => (
  <div
    role="group"
    data-slot="button-group"
    data-orientation={orientation}
    className={cn(buttonGroupVariants({ orientation }), className)}
    style={minecraftStyle(
      style,
      (__style) => ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
    )}
    {...props}
  />
);

const ButtonGroupText = ({
  className,
  render,
  children,
  scale = 2,
  maxWidth,
  align = "left",
  ...props
}: MinecraftPolymorphicProps<"div"> & {
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
}) => {
  if (render) {
    return (
      <MinecraftRender
        render={render}
        data-slot="button-group-text"
        className={cn(`mc-button-group-text`, className)}
        {...props}
      >
        {children}
      </MinecraftRender>
    );
  }

  return (
    <MinecraftDisclosureText
      data-slot="button-group-text"
      className={cn(`mc-button-group-text`, className)}
      scale={scale}
      maxWidth={maxWidth}
      align={align}
      {...props}
    >
      {children}
    </MinecraftDisclosureText>
  );
};

const ButtonGroupSeparator = ({
  className,
  orientation = "vertical",
  scale = 2,
  role = "none",
  edge = "header",
  style,
  ...props
}: Omit<MinecraftProps<typeof Separator>, "orientation"> & {
  orientation?: "horizontal" | "vertical";
}) => (
  <SeparatorPrimitive
    orientation={orientation}
    role={role === "none" ? "none" : "separator"}
    aria-orientation={role === "none" ? undefined : orientation}
    data-slot="button-group-separator"
    data-orientation={orientation}
    className={cn(`mc-button-group-separator`, className)}
    style={minecraftStyle(
      style,
      (__style) => ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
    )}
    {...props}
  >
    <Separator
      scale={scale}
      edge={edge}
      className="mc-button-group-separator-art"
    />
  </SeparatorPrimitive>
);

export {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
  buttonGroupVariants,
};
