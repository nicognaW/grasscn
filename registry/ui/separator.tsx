"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"
import { minecraftSeparatorAssets } from "./minecraft-separator-assets"
import "./minecraft-separator.css"

type SeparatorProps = Omit<React.ComponentProps<typeof SeparatorPrimitive.Root>, "orientation"> & {
  orientation?: "horizontal"
  edge?: "header" | "footer"
  scale?: 1 | 2 | 3
}

function Separator({ className, orientation = "horizontal", decorative = true, edge = "header", scale = 2, style, ...props }: SeparatorProps) {
  if (orientation !== "horizontal") throw new Error("Minecraft Separator supports horizontal orientation only")
  return <SeparatorPrimitive.Root data-slot="separator" data-edge={edge} orientation={orientation} decorative={decorative}
    className={`mc-separator ${className ?? ""}`} style={{ "--mc-scale": scale, "--mc-separator-texture": `url("${minecraftSeparatorAssets[edge]}")`, ...style } as React.CSSProperties} {...props} />
}

export { Separator }
export type { SeparatorProps }
