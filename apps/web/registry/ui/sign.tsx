"use client";

import * as React from "react";

import { adventureAssets } from "./minecraft-adventure-assets";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftSignPaint } from "./minecraft-sign-paint";

import "./minecraft-sign.css";

interface OwnedSignDimensions1 extends React.CSSProperties {
  "--mc-z-sign-base-1-height"?: string;
  "--mc-z-sign-base-1-width"?: string;
}

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
    throw new Error("Minecraft signs contain up to four lines");
  }

  if (!/^#[0-9a-f]{6}$/iu.test(color)) {
    throw new Error("Sign color must be a six-digit hex color");
  }

  const raw = Number.parseInt(color.slice(1), 16);

  const dark =
    /* oxlint-disable no-bitwise -- Darken the packed RGB sign color channel by channel, then repack the native ink word. */
    (Math.floor(((raw >> 16) & 255) * 0.4) << 16) |
    (Math.floor(((raw >> 8) & 255) * 0.4) << 8) |
    Math.floor((raw & 255) * 0.4);

  /* oxlint-enable no-bitwise */
  const ink = glowing ? color : `#${dark.toString(16).padStart(6, "0")}`;

  const texture =
    adventureAssets[`gui/${hanging ? "hanging_signs" : "signs"}/${wood}`];

  return (
    <div
      {...props}
      data-slot={hanging ? "hanging-sign" : "sign"}
      data-wood={wood}
      data-glowing={glowing}
      className={cn("mc-sign mc-owned-base-sign-1", className)}
      role={props.role ?? "group"}
      aria-label={props["aria-label"] ?? lines.join(". ")}
      style={minecraftStyle(style, (__style): OwnedSignDimensions1 => ({
        "--mc-z-sign-base-1-height": `${(hanging ? 74 : 110) * scale}px`,
        "--mc-z-sign-base-1-width": `${120 * scale}px`,
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

const Sign = (props: SignProps) => <SignBoard {...props} />;

const HangingSign = (props: SignProps) => <SignBoard {...props} hanging />;

export { Sign, HangingSign };

export type { SignProps, SignWood };
