"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import * as React from "react";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { MinecraftCardText, CardScaleContext } from "./minecraft-card-text";
import "./minecraft-card.css";
function Card({ className, scale = 2, style, children, ...props }: React.ComponentProps<"div"> & {
    scale?: 1 | 2 | 3;
}) {
    return <div data-slot="card" className={cn("mc-card", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>
    <MinecraftSurface sprite={minecraftCardSprite}/><CardScaleContext value={scale}>{children}</CardScaleContext>
  </div>;
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-header" className={cn("mc-card-header", className)} {...props}/>; }
function CardTitle({ className, children, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-title" className={cn("mc-card-title", className)} {...props}><MinecraftCardText bold>{children}</MinecraftCardText></div>; }
function CardDescription({ className, children, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-description" className={cn("mc-card-description", className)} {...props}><MinecraftCardText>{children}</MinecraftCardText></div>; }
function CardAction({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-action" className={cn("mc-card-action", className)} {...props}/>; }
function CardContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-content" className={cn("mc-card-content", className)} {...props}/>; }
function CardFooter({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-footer" className={cn("mc-card-footer", className)} {...props}/>; }
export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
