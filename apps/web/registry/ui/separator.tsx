"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import * as React from "react";

import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { minecraftSeparatorAssets } from "./minecraft-separator-assets";

import "./minecraft-separator.css";

interface SeparatorPaintStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-separator-texture": string;
}

type SeparatorProps = Omit<
  MinecraftProps<typeof SeparatorPrimitive>,
  "orientation"
> & {
  orientation?: "horizontal";
  edge?: "header" | "footer";
  scale?: 1 | 2 | 3;
};

const Separator = ({
  className,
  orientation = "horizontal",
  role = "none",
  edge = "header",
  scale = 2,
  style,
  ...props
}: SeparatorProps) => {
  if (orientation !== "horizontal") {
    throw new Error("Minecraft Separator supports horizontal orientation only");
  }

  return (
    <SeparatorPrimitive
      data-slot="separator"
      data-edge={edge}
      orientation={orientation}
      role={role}
      aria-hidden={role === "none" ? true : undefined}
      className={cn(`mc-separator`, className)}
      style={minecraftStyle(style, (__style): SeparatorPaintStyle => ({
        "--mc-scale": scale,
        "--mc-separator-texture": `url("${minecraftSeparatorAssets[edge]}")`,
        ...__style,
      }))}
      {...props}
    />
  );
};

export { Separator };

export type { SeparatorProps };
