"use client";

import * as React from "react";

import { AdventureImage } from "./minecraft-adventure-image";
import type { AdventureTexture } from "./minecraft-adventure-image";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-hud.css";

interface HudLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-hud-1-height": number;
  "--mc-dynamic-hud-1-left": number;
  "--mc-dynamic-hud-1-width": number;
}

interface HudLayoutStyle2 extends React.CSSProperties {
  "--mc-dynamic-hud-2-width": number;
}

type MeterProps = React.ComponentProps<"div"> & {
  value: number;
  scale?: 1 | 2 | 3;
  max?: number;
};

const IconMeter = ({
  value,
  max = 20,
  scale = 2,
  kind,
  condition = "normal",
  className,
  style,
  ...props
}: MeterProps & {
  kind: "health" | "armor" | "hunger" | "air";
  condition?: "normal" | "poisoned" | "withered" | "frozen" | "absorbing";
}) => {
  const limit = kind === "air" ? 10 : 20;

  const count = Math.max(
    1,
    Math.min(10, Math.ceil(max / (kind === "air" ? 1 : 2)))
  );

  const amount = Math.max(
    0,
    Math.min(max, limit, Number.isFinite(value) ? value : 0)
  );

  const step = kind === "air" ? 1 : 2;

  const prefix =
    kind === "health"
      ? `gui/sprites/hud/heart/${condition === "normal" ? "" : `${condition}_`}`
      : kind === "hunger"
        ? "gui/sprites/hud/food_"
        : kind === "armor"
          ? "gui/sprites/hud/armor_"
          : "gui/sprites/hud/air";

  return (
    <div
      {...props}
      data-slot={`${kind}-meter`}
      role="meter"
      aria-label={props["aria-label"] ?? kind}
      aria-valuemin={0}
      aria-valuemax={Math.min(max, limit)}
      aria-valuenow={amount}
      className={cn(`mc-hud-meter`, className)}
      style={minecraftStyle(style, (__style) => ({
        height: 9 * scale,
        width: (count * 8 + 1) * scale,
        ...__style,
      }))}
    >
      {Array.from(
        { length: kind === "armor" && amount === 0 ? 0 : count },
        (_, order) => {
          const i = kind === "health" ? count - 1 - order : order;
          const filled = Math.max(0, Math.min(step, amount - i * step));

          const empty =
            kind === "health"
              ? "gui/sprites/hud/heart/container"
              : kind === "air"
                ? "gui/sprites/hud/air_empty"
                : prefix + "empty";

          const fill =
            kind === "air"
              ? "gui/sprites/hud/air"
              : prefix + (filled >= step ? "full" : "half");

          return (
            <span
              key={i}
              className="mc-dynamic-layout-hud-1"
              style={
                /* SAFETY: The owned mc-dynamic-layout-hud-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                {
                  "--mc-dynamic-hud-1-height": 9 * scale,
                  "--mc-dynamic-hud-1-left":
                    (kind === "hunger" || kind === "air" ? count - 1 - i : i) *
                    8 *
                    scale,
                  "--mc-dynamic-hud-1-width": 9 * scale,
                } satisfies HudLayoutStyle1 as HudLayoutStyle1
              }
            >
              {!(
                kind === "air" &&
                (filled > 0 || (amount > 0 && i === Math.ceil(amount)))
              ) && (
                <AdventureImage
                  texture={empty as AdventureTexture}
                  scale={scale}
                />
              )}
              {filled > 0 && (
                <AdventureImage
                  texture={fill as AdventureTexture}
                  scale={scale}
                />
              )}
            </span>
          );
        }
      )}
    </div>
  );
};

const HealthMeter = (
  props: MeterProps & {
    condition?: "normal" | "poisoned" | "withered" | "frozen" | "absorbing";
  }
) => <IconMeter {...props} kind="health" />;

const ArmorMeter = (props: MeterProps) => <IconMeter {...props} kind="armor" />;

const HungerMeter = (props: MeterProps) => (
  <IconMeter {...props} kind="hunger" />
);

const AirMeter = (props: MeterProps) => (
  <IconMeter max={10} {...props} kind="air" />
);

const ExperienceBar = ({
  value,
  scale = 2,
  style,
  className,
  ...props
}: Omit<MeterProps, "max">) => {
  const progress = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const width = Math.min(182, Math.floor(Math.fround(progress * 183)));

  return (
    <div
      {...props}
      data-slot="experience-bar"
      role="meter"
      aria-label={props["aria-label"] ?? "Experience"}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={progress}
      className={cn(`mc-xp-bar`, className)}
      style={minecraftStyle(style, (__style) => ({
        height: 5 * scale,
        width: 182 * scale,
        ...__style,
      }))}
    >
      <AdventureImage
        texture="gui/sprites/hud/experience_bar_background"
        scale={scale}
      />
      <span
        className="mc-dynamic-layout-hud-2"
        style={
          /* SAFETY: The owned mc-dynamic-layout-hud-2 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
          {
            "--mc-dynamic-hud-2-width": width * scale,
          } satisfies HudLayoutStyle2 as HudLayoutStyle2
        }
      >
        <AdventureImage
          texture="gui/sprites/hud/experience_bar_progress"
          scale={scale}
        />
      </span>
    </div>
  );
};

export { HealthMeter, ArmorMeter, HungerMeter, AirMeter, ExperienceBar };

export type { MeterProps };
