"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import * as React from "react";

import { minecraftProgressAssets } from "./minecraft-progress-assets";
import { MinecraftProgressPaint } from "./minecraft-progress-paint";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";

import "./minecraft-progress.css";

type BossBarColor =
  | "pink"
  | "blue"
  | "red"
  | "green"
  | "yellow"
  | "purple"
  | "white";

type BossBarOverlay =
  | "progress"
  | "notched_6"
  | "notched_10"
  | "notched_12"
  | "notched_20";

type ProgressProps = Omit<
  MinecraftProps<typeof ProgressPrimitive.Root>,
  "color"
> & {
  color?: BossBarColor;
  overlay?: BossBarOverlay;
  scale?: 1 | 2 | 3;
};

const Progress = ({
  className,
  value,
  max,
  color = "pink",
  overlay = "progress",
  scale = 2,
  style,
  children,
  render,
  ref,
  ...props
}: ProgressProps) => {
  const maximum =
    typeof max === "number" && !Number.isNaN(max) && max > 0 ? max : 100;

  const valid =
    typeof value === "number" &&
    !Number.isNaN(value) &&
    value >= 0 &&
    value <= maximum;

  const ratio = valid ? value / maximum : 0;
  const fraction = Number.isFinite(ratio) ? Math.fround(ratio) : 0;
  // Original Mth.lerpDiscrete uses a float product and includes the first pixel for any positive progress.
  const filled = Math.floor(Math.fround(fraction * 181)) + Number(fraction > 0);

  const background = minecraftProgressAssets[`${color}_background`];
  const foreground = minecraftProgressAssets[`${color}_progress`];

  const notchBackground =
    overlay === "progress"
      ? undefined
      : minecraftProgressAssets[`${overlay}_background`];

  const notchForeground =
    overlay === "progress"
      ? undefined
      : minecraftProgressAssets[`${overlay}_progress`];

  if (
    !background ||
    !foreground ||
    (overlay !== "progress" && !notchBackground)
  ) {
    throw new Error(
      "Progress supports only original Minecraft boss-bar colors and overlays"
    );
  }

  const content = children;

  const artwork = (
    <>
      {overlay !== "progress" && (
        <MinecraftProgressPaint
          background={`${color}_background`}
          foreground={`${color}_progress`}
          notchBackground={`${overlay}_background`}
          notchForeground={`${overlay}_progress`}
          filled={filled}
        />
      )}
      <ProgressTrack className="mc-progress-fallback" aria-hidden="true">
        <span
          aria-hidden="true"
          className="mc-progress-surface"
          style={{ backgroundImage: `url("${background}")` }}
        />
        {notchBackground && (
          <span
            aria-hidden="true"
            className="mc-progress-surface"
            style={{ backgroundImage: `url("${notchBackground}")` }}
          />
        )}
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          aria-hidden="true"
          className="mc-progress-indicator"
          style={{ height: "100%", width: `calc(${filled} * var(--mc-pixel))` }}
        >
          <span
            className="mc-progress-surface"
            style={{ backgroundImage: `url("${foreground}")` }}
          />
          {notchForeground && (
            <span
              className="mc-progress-surface"
              style={{ backgroundImage: `url("${notchForeground}")` }}
            />
          )}
        </ProgressPrimitive.Indicator>
      </ProgressTrack>
      {content}
    </>
  );

  return (
    <ProgressPrimitive.Root
      render={render}
      ref={ref}
      value={value}
      max={max}
      data-slot="progress"
      data-color={color}
      data-overlay={overlay}
      className={cn(`mc-progress`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    >
      {artwork}
    </ProgressPrimitive.Root>
  );
};

const ProgressTrack = ({
  className,
  ...props
}: MinecraftProps<typeof ProgressPrimitive.Track>) => (
  <ProgressPrimitive.Track
    data-slot="progress-track"
    className={cn(`mc-progress-track`, className)}
    {...props}
  />
);

const ProgressIndicator = ({
  className,
  ...props
}: MinecraftProps<typeof ProgressPrimitive.Indicator>) => (
  <ProgressPrimitive.Indicator
    data-slot="progress-indicator"
    className={cn(`mc-progress-indicator`, className)}
    {...props}
  />
);

const ProgressLabel = (
  props: MinecraftProps<typeof ProgressPrimitive.Label>
) => <ProgressPrimitive.Label data-slot="progress-label" {...props} />;

const ProgressValue = (
  props: MinecraftProps<typeof ProgressPrimitive.Value>
) => <ProgressPrimitive.Value data-slot="progress-value" {...props} />;

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
};

export type { ProgressProps, BossBarColor, BossBarOverlay };
