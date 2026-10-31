"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import { minecraftProgressAssets } from "./minecraft-progress-assets"
import { MinecraftProgressPaint } from "./minecraft-progress-paint"
import "./minecraft-progress.css"

type BossBarColor = "pink" | "blue" | "red" | "green" | "yellow" | "purple" | "white"
type BossBarOverlay = "progress" | "notched_6" | "notched_10" | "notched_12" | "notched_20"
type ProgressProps = Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, "color"> & {
  color?: BossBarColor
  overlay?: BossBarOverlay
  scale?: 1 | 2 | 3
}

function Progress({ className, value = 0, max, color = "pink", overlay = "progress", scale = 2, style, children, asChild, ref, ...props }: ProgressProps) {
  const maximum = typeof max === "number" && !Number.isNaN(max) && max > 0 ? max : 100
  const valid = typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= maximum
  const ratio = valid ? value / maximum : 0
  const fraction = Number.isFinite(ratio) ? Math.fround(ratio) : 0
  // Original Mth.lerpDiscrete uses a float product and includes the first pixel for any positive progress.
  const filled = Math.floor(Math.fround(fraction * 181)) + Number(fraction > 0)
  const background = minecraftProgressAssets[`${color}_background`], foreground = minecraftProgressAssets[`${color}_progress`]
  const notchBackground = overlay === "progress" ? undefined : minecraftProgressAssets[`${overlay}_background`]
  const notchForeground = overlay === "progress" ? undefined : minecraftProgressAssets[`${overlay}_progress`]
  if (!background || !foreground || (overlay !== "progress" && !notchBackground)) throw new Error("Progress supports only original Minecraft boss-bar colors and overlays")
  let content = children
  if (asChild) {
    const child = React.Children.only(children)
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) throw new Error("Progress asChild requires one container element")
    content = child.props.children
  }
  const artwork = <>
    {overlay !== "progress" && <MinecraftProgressPaint background={`${color}_background`} foreground={`${color}_progress`} notchBackground={`${overlay}_background`} notchForeground={`${overlay}_progress`} filled={filled} />}
    <span className="mc-progress-fallback" aria-hidden="true">
    <span aria-hidden="true" className="mc-progress-surface" style={{ backgroundImage: `url("${background}")` }} />
    {notchBackground && <span aria-hidden="true" className="mc-progress-surface" style={{ backgroundImage: `url("${notchBackground}")` }} />}
    <ProgressPrimitive.Indicator data-slot="progress-indicator" aria-hidden="true" className="mc-progress-indicator" style={{ width: `calc(${filled} * var(--mc-pixel))` }}>
      <span className="mc-progress-surface" style={{ backgroundImage: `url("${foreground}")` }} />
      {notchForeground && <span className="mc-progress-surface" style={{ backgroundImage: `url("${notchForeground}")` }} />}
    </ProgressPrimitive.Indicator>
    </span>
    {content}
  </>
  return <ProgressPrimitive.Root ref={ref} asChild={asChild} value={value} max={max} data-slot="progress" data-color={color} data-overlay={overlay}
    className={`mc-progress ${className ?? ""}`} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>
    {asChild ? React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, undefined, artwork) : artwork}
  </ProgressPrimitive.Root>
}

export { Progress }
export type { ProgressProps, BossBarColor, BossBarOverlay }
