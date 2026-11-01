"use client";

import * as React from "react";

import { adventureAssets } from "./minecraft-adventure-assets";
import { minecraftStyle } from "./minecraft-render";

type AdventureTexture = keyof typeof adventureAssets;

const AdventureImage = ({
  texture,
  scale = 1,
  style,
  ...props
}: Omit<React.ComponentProps<"img">, "src"> & {
  texture: AdventureTexture;
  scale?: number;
}) => {
  const asset = adventureAssets[texture];

  return (
    <img
      alt=""
      draggable={false}
      {...props}
      src={asset.src}
      width={asset.width * scale}
      height={asset.height * scale}
      style={minecraftStyle(style, (__style) => ({
        imageRendering: "pixelated",
        pointerEvents: "none",
        ...__style,
      }))}
    />
  );
};

export { AdventureImage };

export type { AdventureTexture };
