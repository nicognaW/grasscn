"use client";

import * as React from "react";

import { adventureAssets } from "./minecraft-adventure-assets";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftSignPaint } from "./minecraft-sign-paint";

import "./minecraft-sign.css";

type SignWood =
  | "oak"
  | "spruce"
  | "birch"
  | "jungle"
  | "acacia"
  | "dark_oak"
  | "mangrove"
  | "cherry"
  | "bamboo"
  | "crimson"
  | "warped"
  | "pale_oak";

type SignProps = Omit<React.ComponentProps<"div">, "color"> & {
  lines: readonly string[];
  wood?: SignWood;
  scale?: 1 | 2 | 3;
  color?: string;
  glowing?: boolean;
};

const SignBoard = ({
  lines,
  wood = "oak",
  scale = 2,
  color = "#000000",
  glowing = false,
  hanging = false,
  className,
  style,
  ...props
}: SignProps & {
  hanging?: boolean;
}) => {
  if (lines.length > 4) {
    throw Error("Minecraft signs contain up to four lines");
  }

  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw Error("Sign color must be a six-digit hex color");
  }

  const raw = Number.parseInt(color.slice(1), 16),
    dark =
      (Math.floor(((raw >> 16) & 255) * 0.4) << 16) |
      (Math.floor(((raw >> 8) & 255) * 0.4) << 8) |
      Math.floor((raw & 255) * 0.4),
    ink = glowing ? color : `#${dark.toString(16).padStart(6, "0")}`,
    texture =
      adventureAssets[`gui/${hanging ? "hanging_signs" : "signs"}/${wood}`],
    origin = hanging ? 50 : 30,
    factor = hanging ? 4.5 : 3.9,
    textScale = hanging ? 1 : Math.fround(0.9765628),
    width = hanging ? 60 : 90;

  return (
    <div
      {...props}
      data-slot={hanging ? "hanging-sign" : "sign"}
      data-wood={wood}
      data-glowing={glowing}
      className={cn(`mc-sign`, className)}
      role={props.role ?? "group"}
      aria-label={props["aria-label"] ?? lines.join(". ")}
      style={minecraftStyle(style, (__style) => ({
        height: (hanging ? 74 : 110) * scale,
        width: 120 * scale,
        ...__style,
      }))}
    >
      <MinecraftSignPaint
        src={texture.src}
        lines={lines}
        scale={scale}
        color={ink}
        hanging={hanging}
      />
      <span className="mc-sign-accessible">{lines.join("\n")}</span>
    </div>
  );
};

const Sign = (props: SignProps) => {
  return <SignBoard {...props} />;
};

const HangingSign = (props: SignProps) => {
  return <SignBoard {...props} hanging />;
};

export { Sign, HangingSign };

export type { SignProps, SignWood };
