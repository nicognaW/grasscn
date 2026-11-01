"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import * as React from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { minecraftSeparatorAssets } from "./minecraft-separator-assets";
import "./minecraft-separator.css";
type SeparatorProps = Omit<MinecraftProps<typeof SeparatorPrimitive>, "orientation"> & {
    orientation?: "horizontal";
    edge?: "header" | "footer";
    scale?: 1 | 2 | 3;
};
function Separator({ className, orientation = "horizontal", role = "none", edge = "header", scale = 2, style, ...props }: SeparatorProps) {
    if (orientation !== "horizontal")
        throw new Error("Minecraft Separator supports horizontal orientation only");
    return <SeparatorPrimitive data-slot="separator" data-edge={edge} orientation={orientation} role={role} aria-hidden={role === "none" ? true : undefined} className={cn(`mc-separator ${""}`, className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, "--mc-separator-texture": `url("${minecraftSeparatorAssets[edge]}")`, ...__style } as React.CSSProperties))} {...props}/>;
}
export { Separator };
export type { SeparatorProps };
