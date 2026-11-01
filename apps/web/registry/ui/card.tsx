"use client";

import * as React from "react";

import { minecraftCardSprite } from "./minecraft-card-sprite";
import { MinecraftCardText, CardScaleContext } from "./minecraft-card-text";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";

import "./minecraft-card.css";

const Card = ({
  className,
  scale = 2,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  scale?: 1 | 2 | 3;
}) => (
  <div
    data-slot="card"
    className={cn("mc-card", className)}
    style={minecraftStyle(
      style,
      (__style) => ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
    )}
    {...props}
  >
    <MinecraftSurface sprite={minecraftCardSprite} />
    <CardScaleContext value={scale}>{children}</CardScaleContext>
  </div>
);

const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card-header"
    className={cn("mc-card-header", className)}
    {...props}
  />
);

const CardTitle = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="card-title"
    className={cn("mc-card-title", className)}
    {...props}
  >
    <MinecraftCardText bold>{children}</MinecraftCardText>
  </div>
);

const CardDescription = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="card-description"
    className={cn("mc-card-description", className)}
    {...props}
  >
    <MinecraftCardText>{children}</MinecraftCardText>
  </div>
);

const CardAction = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card-action"
    className={cn("mc-card-action", className)}
    {...props}
  />
);

const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card-content"
    className={cn("mc-card-content", className)}
    {...props}
  />
);

const CardFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card-footer"
    className={cn("mc-card-footer", className)}
    {...props}
  />
);

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
};
