"use client"

import * as React from "react"
import { Direction, Slider as SliderPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { MinecraftSurface } from "./minecraft-surface"
import { MinecraftText } from "./minecraft-text"
import { minecraftSliderSprites as sprites } from "./minecraft-slider-sprites"
import "./minecraft-slider.css"

function Slider({ className, defaultValue, value, min = 0, max = 100, scale = 2,
  label, style, disabled, orientation = "horizontal", dir: direction, inverted = false,
  onValueChange, onFocusCapture, onBlurCapture, onKeyDown, onMouseEnter, onMouseLeave, ...props }:
  React.ComponentProps<typeof SliderPrimitive.Root> & { scale?: 1 | 2 | 3; label?: string }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? [min, max])
  const dir = Direction.useDirection(direction)
  const values = value ?? uncontrolled
  const [editing, setEditing] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  const highlightTrack = !disabled && focused && !editing
  const highlightHandle = !disabled && (hovered || (focused && editing))
  return <SliderPrimitive.Root
    data-slot="slider"
    className={cn("mc-slider", className)}
    min={min} max={max} value={values} disabled={disabled} orientation={orientation} dir={dir} inverted={inverted}
    style={{ "--mc-scale": scale, ...style } as React.CSSProperties}
    onValueChange={next => { setUncontrolled(next); onValueChange?.(next) }}
    onFocusCapture={event => { onFocusCapture?.(event); if (!event.defaultPrevented) { setFocused(true); setEditing(true) } }}
    onBlurCapture={event => { onBlurCapture?.(event); if (!event.currentTarget.contains(event.relatedTarget)) { setFocused(false); setEditing(false) } }}
    onKeyDown={event => { onKeyDown?.(event); if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setEditing(current => !current) } }}
    onMouseEnter={event => { onMouseEnter?.(event); if (!event.defaultPrevented) setHovered(true) }}
    onMouseLeave={event => { onMouseLeave?.(event); if (!event.defaultPrevented) setHovered(false) }}
    {...props}
  >
    <SliderPrimitive.Track data-slot="slider-track" className="mc-slider-track">
      <MinecraftSurface sprite={highlightTrack ? sprites.slider_highlighted : sprites.slider} />
      <SliderPrimitive.Range data-slot="slider-range" className="mc-slider-range" />
    </SliderPrimitive.Track>
    {values.map((current, index) => {
      const fraction = max === min ? 0 : Math.min(1, Math.max(0, (current - min) / (max - min)))
      const reverse = orientation === "horizontal" ? (dir === "rtl") !== inverted : !inverted
      return <span key={index} className="mc-slider-position" style={{ "--mc-thumb-fraction": reverse ? 1 - fraction : fraction } as React.CSSProperties}>
        <SliderPrimitive.Thumb data-slot="slider-thumb" className="mc-slider-thumb" aria-label={values.length === 1 ? props["aria-label"] : undefined} aria-labelledby={values.length === 1 ? props["aria-labelledby"] : undefined}>
          <span className="mc-slider-handle"><MinecraftSurface sprite={highlightHandle ? sprites.slider_handle_highlighted : sprites.slider_handle} /></span>
        </SliderPrimitive.Thumb>
      </span>
    })}
    {label != null && <MinecraftText className="mc-slider-label">{label}</MinecraftText>}
  </SliderPrimitive.Root>
}
export { Slider }
