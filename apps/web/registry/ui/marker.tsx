"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { Label } from "./label";
import type { LabelProps } from "./label";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type {
  MinecraftProps,
  MinecraftPolymorphicProps,
} from "./minecraft-render";
import { minecraftSeparatorAssets } from "./minecraft-separator-assets";

import "./minecraft-marker.css";

const MarkerScale = React.createContext<1 | 2 | 3>(2);

const markerVariants = cva("mc-marker", {
  defaultVariants: { variant: "default" },
  variants: {
    variant: {
      border: "mc-marker-border",
      default: "",
      separator: "mc-marker-separated",
    },
  },
});

type MarkerProps = MinecraftPolymorphicProps<"div"> &
  VariantProps<typeof markerVariants> & {
    scale?: 1 | 2 | 3;
    separatorEdge?: "header" | "footer";
  };

const Marker = ({
  variant = "default",
  render,
  scale = 2,
  separatorEdge = "header",
  className,
  children,
  style,
  ...props
}: MarkerProps) => {
  if (!["default", "separator", "border"].includes(variant ?? "default")) {
    throw Error("Unsupported Minecraft marker layout");
  }

  const Root = MinecraftRender;

  const content = children;

  const contents = isMinecraftTextContent(content) ? (
    <MarkerContent>{content}</MarkerContent>
  ) : (
    content
  );

  return (
    <MarkerScale value={scale}>
      <Root
        render={render}
        as="div"
        data-slot="marker"
        data-variant={variant}
        className={cn(markerVariants({ variant }), className)}
        style={minecraftStyle(
          style,
          (__style) =>
            ({
              "--mc-marker-separator": `url("${minecraftSeparatorAssets[separatorEdge]}")`,
              "--mc-scale": scale,
              ...__style,
            }) as React.CSSProperties
        )}
        {...props}
      >
        {contents}
      </Root>
    </MarkerScale>
  );
};

const MarkerIcon = ({ className, ...props }: MinecraftProps<"span">) => {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn(`mc-marker-icon`, className)}
      {...props}
    />
  );
};

const MarkerContent = ({
  className,
  children,
  maxWidth,
  align = "left",
  ...props
}: MinecraftProps<"span"> & Pick<LabelProps, "maxWidth" | "align">) => {
  const scale = React.useContext(MarkerScale);

  return (
    <span
      data-slot="marker-content"
      className={cn(`mc-marker-content`, className)}
      {...props}
    >
      {isMinecraftTextContent(children) ? (
        <Label
          scale={scale}
          maxWidth={maxWidth}
          align={align}
          style={{ width: "100%" }}
        >
          {children}
        </Label>
      ) : (
        children
      )}
    </span>
  );
};

export { Marker, MarkerIcon, MarkerContent, markerVariants };

export type { MarkerProps };
