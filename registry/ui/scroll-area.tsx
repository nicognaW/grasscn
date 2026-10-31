"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import { minecraftTextareaAssets } from "./minecraft-textarea-assets"
import "./minecraft-scroll-area.css"

type Geometry = { height: number; content: number; maximum: number; thumb: number; offset: number }
const empty: Geometry = { height: 0, content: 0, maximum: 0, thumb: 32, offset: 0 }
const ScrollContext = React.createContext<{ viewport: React.RefObject<HTMLDivElement | null>; scale: number; disabled: boolean; geometry: Geometry } | null>(null)
type ScrollAreaProps = Omit<React.ComponentProps<typeof ScrollAreaPrimitive.Root>, "type" | "scrollHideDelay"> & {
  type?: "auto"
  scale?: 1 | 2 | 3
  /** Disables scrolling; child controls retain their own state. */
  disabled?: boolean
  viewportRef?: React.Ref<HTMLDivElement>
  viewportProps?: Omit<React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>, "children" | "ref" | "asChild">
}

function ScrollArea({ children, className, scale = 2, disabled = false, type = "auto", viewportRef, viewportProps, style, ref, asChild, onWheelCapture, onKeyDownCapture, ...props }: ScrollAreaProps) {
  if (type !== "auto") throw new Error("Minecraft ScrollArea shows its scrollbar whenever content overflows")
  const viewport = React.useRef<HTMLDivElement>(null)
  const setViewportRef = React.useCallback((element: HTMLDivElement | null) => {
    viewport.current = element
    if (typeof viewportRef === "function") {
      const cleanup = viewportRef(element)
      if (typeof cleanup === "function") return () => { viewport.current = null; cleanup() }
    } else if (viewportRef) viewportRef.current = element
  }, [viewportRef])
  const [geometry, setGeometry] = React.useState(empty)
  const [ready, setReady] = React.useState(false)
  React.useLayoutEffect(() => {
    let frame = 0, signature = ""
    const measure = () => {
      const element = viewport.current!
      const height = element.clientHeight / scale, content = element.scrollHeight / scale
      const maximum = Math.max(0, content - height)
      // Mth.clamp applies the upper bound last, even when height - 8 is below 32.
      const thumb = Math.min(height - 8, Math.max(32, Math.trunc(Math.fround(Math.fround(height * height) / Math.fround(content)))))
      const offset = maximum > 0 ? Math.floor(Math.floor(element.scrollTop / scale) * (height - thumb) / maximum) : 0
      const next = JSON.stringify([height, content, maximum, thumb, offset])
      if (next !== signature) { signature = next; setGeometry({ height, content, maximum, thumb, offset }); setReady(true) }
      frame = requestAnimationFrame(measure)
    }
    frame = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(frame)
  }, [scale])
  let content = children
  if (asChild) {
    const child = React.Children.only(children)
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) throw new Error("ScrollArea asChild requires one container element")
    content = child.props.children
  }
  const nodes = React.Children.toArray(content)
  const customBars = nodes.filter(node => React.isValidElement(node) && node.type === ScrollBar)
  const contents = nodes.filter(node => !React.isValidElement(node) || node.type !== ScrollBar)
  const chrome = <>
    <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" ref={setViewportRef} tabIndex={disabled ? -1 : 0} {...viewportProps}
      className={`mc-scroll-area-viewport ${viewportProps?.className ?? ""}`} style={{ ...(disabled ? { overflowY: "hidden" } : {}), ...viewportProps?.style }}>{contents}</ScrollAreaPrimitive.Viewport>
    {customBars.length ? customBars : <ScrollBar />}
  </>
  return <ScrollContext.Provider value={{ viewport, scale, disabled, geometry }}>
    <ScrollAreaPrimitive.Root ref={ref} asChild={asChild} type={type} data-slot="scroll-area" data-mc-scroll-ready={ready} data-scrollable={geometry.maximum > 0} data-disabled={disabled || undefined}
      className={`mc-scroll-area ${className ?? ""}`} style={{ "--mc-scale": scale, ...style } as React.CSSProperties}
      onWheelCapture={event => { onWheelCapture?.(event); if (disabled) { event.preventDefault(); event.stopPropagation() } }}
      onKeyDownCapture={event => { onKeyDownCapture?.(event); if (disabled && event.target === viewport.current && ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) event.preventDefault() }} {...props}>
      {asChild ? React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, undefined, chrome) : chrome}
    </ScrollAreaPrimitive.Root>
  </ScrollContext.Provider>
}

type ScrollBarProps = Omit<React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>, "orientation"> & { orientation?: "vertical" }
function ScrollBar({ children, asChild, className, orientation = "vertical", style, onPointerDownCapture, onPointerMoveCapture, onPointerUpCapture, onPointerCancelCapture, onLostPointerCapture, ...props }: ScrollBarProps) {
  if (orientation !== "vertical") throw new Error("Minecraft ScrollBar supports vertical orientation only")
  const context = React.useContext(ScrollContext)
  if (!context) throw new Error("ScrollBar must be rendered inside ScrollArea")
  const { viewport, scale, disabled, geometry } = context
  const drag = React.useRef<{ y: number; scroll: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const stop = () => { drag.current = null; setDragging(false) }
  const thumb = <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="mc-scroll-area-thumb" forceMount />
  if (asChild && !React.isValidElement<{ children?: React.ReactNode }>(children)) throw new Error("ScrollBar asChild requires one container element")
  return <ScrollAreaPrimitive.Scrollbar {...props} asChild={asChild} forceMount orientation={orientation} data-slot="scroll-area-scrollbar" data-dragging={dragging || undefined} aria-disabled={disabled || undefined}
    className={`mc-scroll-area-scrollbar ${className ?? ""}`} style={{ "--mc-track": `url("${minecraftTextareaAssets.scroller_background}")`, "--mc-thumb": `url("${minecraftTextareaAssets.scroller}")`, "--mc-thumb-height": `${geometry.thumb * scale}px`, "--mc-thumb-offset": `${geometry.offset * scale}px`, ...style } as React.CSSProperties}
    onPointerDownCapture={event => {
      onPointerDownCapture?.(event)
      if (event.defaultPrevented) return
      if (disabled) { event.preventDefault(); return }
      if (event.button !== 0) return
      event.preventDefault()
      const element = viewport.current!, bounds = event.currentTarget.getBoundingClientRect()
      if (!(event.target as Element).closest('[data-slot="scroll-area-thumb"]')) {
        element.scrollTop = Math.max(0, Math.min(geometry.maximum * scale, (event.clientY - bounds.top - geometry.thumb * scale / 2) * geometry.maximum / Math.max(1, geometry.height - geometry.thumb)))
      }
      drag.current = { y: event.clientY, scroll: element.scrollTop }; setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }}
    onPointerMoveCapture={event => {
      onPointerMoveCapture?.(event)
      if (!event.defaultPrevented && drag.current && !disabled) {
        event.preventDefault()
        viewport.current!.scrollTop = drag.current.scroll + (event.clientY - drag.current.y) * geometry.maximum / Math.max(1, geometry.height - geometry.thumb)
      }
    }}
    onPointerUpCapture={event => { onPointerUpCapture?.(event); if (drag.current) { event.preventDefault(); stop() } }}
    onPointerCancelCapture={event => { onPointerCancelCapture?.(event); stop() }}
    onLostPointerCapture={event => { onLostPointerCapture?.(event); stop() }}>
    {asChild ? React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, undefined, thumb) : <>{thumb}{children}</>}
  </ScrollAreaPrimitive.Scrollbar>
}

export { ScrollArea, ScrollBar }
export type { ScrollAreaProps, ScrollBarProps }
