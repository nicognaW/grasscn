"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { MinecraftSurface } from "./minecraft-surface"
import { MinecraftText } from "./minecraft-text"
import { minecraftTooltipSprites as sprites } from "./minecraft-tooltip-sprites"
import { minecraftTextWidth, wrapMinecraftTooltip } from "./minecraft-tooltip-layout"
import { MinecraftTooltipSurface } from "./minecraft-tooltip-paint"
import "./minecraft-tooltip.css"

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}
function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) { return <TooltipPrimitive.Root data-slot="tooltip" {...props} /> }
function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) { return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} /> }

function TooltipContent({ className, sideOffset = 0, scale = 2, maxWidth = 170, children, asChild, style, ref, ...props }:
  React.ComponentProps<typeof TooltipPrimitive.Content> & { scale?: 1 | 2 | 3; maxWidth?: number }) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const [available, setAvailable] = React.useState(maxWidth)
  React.useImperativeHandle(ref, () => node!, [node])
  React.useLayoutEffect(() => {
    if (!node) return
    const measure = () => {
      const physical = parseFloat(getComputedStyle(node).getPropertyValue("--radix-tooltip-content-available-width")) || window.innerWidth
      setAvailable(Math.max(1, Math.min(maxWidth, Math.floor(physical / scale - 24))))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    window.addEventListener("resize", measure)
    return () => { observer.disconnect(); window.removeEventListener("resize", measure) }
  }, [node, maxWidth, scale])
  const skin = (content: React.ReactNode) => {
    const plain = (typeof content === "string" || typeof content === "number") && /^[\x20-\x7e\n]*$/.test(String(content)) ? String(content) : undefined
    const lines = plain == null ? undefined : wrapMinecraftTooltip(plain, Math.min(maxWidth, available))
    const width = lines ? Math.max(0, ...lines.map(minecraftTextWidth)) + 24 : undefined
    const height = lines ? (lines.length === 1 ? 8 : lines.length * 10) + 24 : undefined
    return <>{width && height ? <MinecraftTooltipSurface width={width} height={height} scale={scale} /> : <><MinecraftSurface sprite={sprites.background} /><MinecraftSurface sprite={sprites.frame} /></>}
      <div className="mc-tooltip-lines">{lines ? lines.map((line, index) => <MinecraftText className="mc-tooltip-line" key={index}>{line}</MinecraftText>) : content}</div>
    </>
  }
  const plain = typeof children === "string" || typeof children === "number" ? String(children) :
    asChild && React.isValidElement<{ children?: React.ReactNode }>(children) && typeof children.props.children === "string" ? children.props.children : undefined
  const lines = plain == null || !/^[\x20-\x7e\n]*$/.test(plain) ? undefined : wrapMinecraftTooltip(plain, Math.min(maxWidth, available))
  const width = lines ? Math.max(0, ...lines.map(minecraftTextWidth)) + 24 : undefined
  const height = lines ? (lines.length === 1 ? 8 : lines.length * 10) + 24 : undefined
  const content = asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
    ? React.cloneElement(children, {}, skin(children.props.children)) : skin(children)
  return <TooltipPrimitive.Portal forceMount={props.forceMount}>
    <TooltipPrimitive.Content ref={setNode} data-slot="tooltip-content" sideOffset={sideOffset} asChild={asChild}
      className={cn("mc-tooltip", className)} style={{ "--mc-scale": scale, "--mc-tooltip-max": maxWidth, "--mc-tooltip-width": width, "--mc-tooltip-height": height, ...style } as React.CSSProperties} {...props}>
      {content}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
