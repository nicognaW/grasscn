"use client";
import * as React from "react";
import { MinecraftSurface } from "../../registry/ui/minecraft-surface";
import { minecraftCardSprite } from "../../registry/ui/minecraft-card-sprite";
import "./legacy-skeleton.css";
function Skeleton({ className, scale = 2, style, children, ...props }: React.ComponentProps<"div"> & {
    scale?: 1 | 2 | 3;
}) { return <div data-slot="skeleton" className={`mc-skeleton ${className ?? ""}`} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}><MinecraftSurface sprite={minecraftCardSprite}/>{children}</div>; }
export { Skeleton };
