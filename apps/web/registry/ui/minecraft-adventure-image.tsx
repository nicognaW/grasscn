"use client";

import * as React from "react";

import { adventureAssets } from "./minecraft-adventure-assets";
import { minecraftClasses as cn } from "./minecraft-render";

type AdventureTexture = keyof typeof adventureAssets;

const AdventureImage = ({
  texture,
  scale = 1,
  style,
  className,
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
      className={cn(
        "pointer-events-none [image-rendering:pixelated]",
        className
      )}
      style={style}
    />
  );
};

export { AdventureImage };

export type { AdventureTexture };
