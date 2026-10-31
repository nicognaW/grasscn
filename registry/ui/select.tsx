"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"
import { MinecraftText } from "./minecraft-text"
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label"
import { minecraftGlyphs } from "./minecraft-font"
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont"
import { selectUnihexAtlas } from "./minecraft-select-atlas"
import { minecraftSelectAssets as assets } from "./minecraft-select-assets"
import { minecraftTextareaAssets as scrollbar } from "./minecraft-textarea-assets"
import { playMinecraftClick } from "./minecraft-sound"
import "./minecraft-button.css"
import "./minecraft-select.css"

const ScaleContext = React.createContext<1 | 2 | 3>(2)
const AnchorContext = React.createContext("")
function useElement<T extends HTMLElement>(ref: React.Ref<T> | undefined) {
  const [element, setElement] = React.useState<T | null>(null)
  const callback = React.useCallback((node: T | null) => {
    setElement(node)
    if (typeof ref === "function") {
      const cleanup = ref(node)
      if (typeof cleanup === "function") return () => { setElement(null); cleanup() }
    } else if (ref) ref.current = node
  }, [ref])
  return [element, callback] as const
}
function textSkin(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string" || typeof children === "number") {
    const text = String(children)
    return /^[\x20-\x7e]*$/.test(text) ? <MinecraftText>{text}</MinecraftText> : <MinecraftUnicodeLabel text={text} atlas={selectUnihexAtlas} />
  }
  return children
}

function Select({ scale = 2, open, defaultOpen, onOpenChange, ...props }: React.ComponentProps<typeof SelectPrimitive.Root> & { scale?: 1 | 2 | 3 }) {
  const anchorId = React.useId()
  const [localOpen, setLocalOpen] = React.useState(defaultOpen ?? false)
  const actualOpen = open ?? localOpen
  const previous = React.useRef(actualOpen), requested = React.useRef(false)
  React.useEffect(() => {
    if (actualOpen && !previous.current && requested.current) playMinecraftClick()
    previous.current = actualOpen; requested.current = false
  }, [actualOpen])
  return <ScaleContext.Provider value={scale}><AnchorContext.Provider value={anchorId}><SelectPrimitive.Root open={actualOpen} onOpenChange={next => {
    requested.current = next
    if (open === undefined) setLocalOpen(next)
    onOpenChange?.(next)
  }} {...props} /></AnchorContext.Provider></ScaleContext.Provider>
}
function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) { return <SelectPrimitive.Group data-slot="select-group" {...props} /> }
function SelectValue({ children, placeholder, ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" placeholder={textSkin(placeholder)} {...props}>{children === undefined ? undefined : textSkin(children)}</SelectPrimitive.Value>
}

type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "default" }
function SelectTrigger({ children, className, size = "default", style, ref, asChild, ...props }: SelectTriggerProps) {
  if (size !== "default") throw new Error("Minecraft cycle buttons support the default visual size only")
  const scale = React.useContext(ScaleContext), anchorId = React.useContext(AnchorContext), [element, forwarded] = useElement(ref)
  React.useLayoutEffect(() => {
    if (!element) return
    let frame = 0, stopped = false, loading = false
    const measure = () => {
      const label = element.querySelector<HTMLElement>(".mc-select-trigger-label")!
      const text = label.textContent ?? ""
      if (/[^\x00-\x7f]/.test(text) && !loading) { loading = true; loadUnihex().then(() => { if (!stopped) element.dataset.mcSelectReady = "false" }) }
      const width = Math.floor(element.clientWidth / scale)
      const textWidth = Math.ceil(Array.from(text).reduce((sum, char) => sum + (minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ?? getUnihexGlyph(char)?.advance ?? 6), 0))
      const available = width - 4, overflow = textWidth - available
      let x = Math.floor(width / 2) - Math.floor(textWidth / 2)
      if (overflow > 0) {
        const period = Math.max(overflow * .5, 3), phase = Math.sin(Math.PI / 2 * Math.cos(2 * Math.PI * (Date.now() / 1000) / period)) / 2 + .5
        x = 2 - Math.trunc(phase * overflow)
      }
      element.style.setProperty("--mc-select-label-x", `${(x - 2) * scale}px`)
      element.dataset.mcSelectReady = "true"
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => { stopped = true; cancelAnimationFrame(frame) }
  }, [element, scale])
  const child = asChild ? React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }> : null
  const contents = <><span className="mc-button-surface" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</span><span className="mc-select-trigger-window"><span className="mc-select-trigger-label">{child ? textSkin(child.props.children) : textSkin(children)}</span></span></>
  return <SelectPrimitive.Trigger data-slot="select-trigger" data-mc-select-anchor={anchorId} data-size={size} asChild={asChild} ref={forwarded} className={`mc-button mc-select-trigger ${className ?? ""}`} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>{child ? React.cloneElement(child, undefined, contents) : contents}</SelectPrimitive.Trigger>
}

type ContentContext = { scale: number; viewport: HTMLDivElement | null }
const ListContext = React.createContext<ContentContext>({ scale: 2, viewport: null })
function SelectContent({ children, className, style, position = "popper", align = "start", sideOffset, collisionPadding = 10, ref, asChild, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const scale = React.useContext(ScaleContext), anchorId = React.useContext(AnchorContext), [element, forwarded] = useElement(ref)
  const [viewport, setViewport] = React.useState<HTMLDivElement | null>(null)
  React.useLayoutEffect(() => {
    if (!element || !viewport) return
    let frame = 0, placed = "", placedTop = "", placedHeight = ""
    const measure = () => {
      const width = Math.floor(viewport.clientWidth / scale), height = viewport.clientHeight / scale, content = viewport.scrollHeight / scale
      const rowWidth = width >= 270 ? 270 : Math.max(0, width - 30)
      const maximum = Math.max(0, content - height)
      const thumb = Math.min(height - 8, Math.max(32, Math.trunc(Math.fround(Math.fround(height * height) / Math.fround(content)))))
      element.style.setProperty("--mc-select-row-left", `${(Math.floor(width / 2) - Math.floor(rowWidth / 2)) * scale}px`)
      element.style.setProperty("--mc-select-row-width", `${rowWidth * scale}px`)
      element.style.setProperty("--mc-select-label-center", `${Math.floor(rowWidth / 2) * scale}px`)
      element.style.setProperty("--mc-select-bar-x", `${(width >= 270 ? Math.floor(width / 2) + 143 : width - 7) * scale}px`)
      element.style.setProperty("--mc-select-thumb-height", `${thumb * scale}px`)
      element.style.setProperty("--mc-select-thumb-y", `${maximum > 0 ? Math.floor(Math.floor(viewport.scrollTop / scale) * (height - thumb) / maximum) * scale : 0}px`)
      if (position === "item-aligned") {
        const trigger = document.querySelector<HTMLElement>(`[data-mc-select-anchor="${anchorId}"]`)
        const selected = element.querySelector<HTMLElement>('[data-slot="select-item"][data-state="checked"]') ?? element.querySelector<HTMLElement>('[data-slot="select-item"]:not([data-disabled])')
        if (trigger && selected) {
          const anchor = trigger.getBoundingClientRect(), box = element.getBoundingClientRect()
          const textWidth = selected.querySelector<HTMLElement>(".mc-select-item-label")?.getBoundingClientRect().width
          const valueWidth = trigger.querySelector<HTMLElement>(".mc-select-trigger-label")?.getBoundingClientRect().width
          const signature = [anchor.x,anchor.y,anchor.width,anchor.height,box.width,box.height,selected.offsetTop,textWidth,valueWidth,selected.textContent].join("|")
          const wrapper = element.parentElement!
          const radixRepositioned = placed && (wrapper.style.top !== placedTop || wrapper.style.height !== placedHeight || wrapper.style.margin !== "0px")
          if (signature !== placed || radixRepositioned) {
            // Radix assumes its viewport fills an expanding wrapper. Center the actual
            // native row in our fixed-height viewport, then align that visible row.
            viewport.scrollTop = Math.floor(Math.max(0,Math.min(viewport.scrollHeight-viewport.clientHeight,selected.offsetTop-(viewport.clientHeight-selected.offsetHeight)/2))/scale)*scale
            const item = selected.getBoundingClientRect(), label = selected.querySelector<HTMLElement>(".mc-select-item-label")?.getBoundingClientRect() ?? item
            const value = trigger.querySelector<HTMLElement>(".mc-select-trigger-label")?.getBoundingClientRect() ?? anchor
            Object.assign(wrapper.style,{position:"fixed",top:`${Math.round(Math.max(10,Math.min(innerHeight-box.height-10,anchor.top+anchor.height/2-(item.top-box.top+item.height/2))))}px`,left:`${Math.round(Math.max(10,Math.min(innerWidth-box.width-10,box.left+value.left-label.left)))}px`,right:"auto",bottom:"auto",width:`${box.width}px`,height:`${box.height}px`,minWidth:"0px",minHeight:"0px",margin:"0px",justifyContent:"flex-start"})
            placed = signature
            placedTop = wrapper.style.top; placedHeight = wrapper.style.height
          }
        }
      }
      element.dataset.mcSelectScrollable = String(maximum > 0)
      element.dataset.mcSelectReady = "true"
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [element, viewport, scale, position, anchorId])
  const child = asChild ? React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }> : null
  const contents = <><SelectPrimitive.Viewport data-slot="select-viewport" ref={setViewport} className="mc-select-viewport" onScroll={event => {
    // Keep native fixed-height scrolling; Radix otherwise expands and bottom-aligns its item-aligned wrapper.
    event.preventDefault(); const node = event.currentTarget; const integer = Math.floor(node.scrollTop / scale) * scale; if (node.scrollTop !== integer) node.scrollTop = integer }}>{child ? child.props.children : children}</SelectPrimitive.Viewport><SelectScrollbar /></>
  return <SelectPrimitive.Portal><ListContext.Provider value={{ scale, viewport }}><SelectPrimitive.Content asChild={asChild} data-slot="select-content" position={position} align={align} sideOffset={sideOffset ?? 2 * scale} collisionPadding={collisionPadding} ref={forwarded} className={`mc-select-content ${className ?? ""}`} style={{ "--mc-scale": scale, "--mc-select-background": assets.menu_list_background, "--mc-select-header": assets.header_separator, "--mc-select-footer": assets.footer_separator, "--mc-select-track": `url("${scrollbar.scroller_background}")`, "--mc-select-thumb": `url("${scrollbar.scroller}")`, ...style } as React.CSSProperties} {...props}>
    {child ? React.cloneElement(child, undefined, contents) : contents}
  </SelectPrimitive.Content></ListContext.Provider></SelectPrimitive.Portal>
}
function SelectScrollbar() {
  const { viewport, scale } = React.useContext(ListContext)
  const drag = React.useRef<{ y: number; top: number } | null>(null)
  return <div className="mc-select-scrollbar" aria-hidden="true" onPointerDown={event => {
    if (!viewport) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect(), content = viewport.scrollHeight / scale, height = viewport.clientHeight / scale
    const thumb = Math.min(height - 8, Math.max(32, Math.trunc(Math.fround(Math.fround(height * height) / Math.fround(content)))))
    const offset = Math.floor(Math.floor(viewport.scrollTop / scale) * (height - thumb) / (content - height))
    const y = (event.clientY - rect.top) / scale
    drag.current = { y: event.clientY, top: viewport.scrollTop }
    if (y < offset || y > offset + thumb) { viewport.scrollTop = Math.floor(Math.max(0, y - thumb / 2) * (content - height) / (height - thumb)) * scale; drag.current.top = viewport.scrollTop }
    event.currentTarget.setPointerCapture(event.pointerId)
  }} onPointerMove={event => {
    if (!viewport || !drag.current) return
    const content = viewport.scrollHeight / scale, height = viewport.clientHeight / scale
    const thumb = Math.min(height - 8, Math.max(32, Math.trunc(Math.fround(Math.fround(height * height) / Math.fround(content)))))
    viewport.scrollTop = Math.floor((drag.current.top + (event.clientY - drag.current.y) * (content - height) / (height - thumb)) / scale) * scale
  }} onPointerUp={event => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId) }} onLostPointerCapture={() => { drag.current = null }}><span /></div>
}
function SelectItem({ children, className, asChild, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const child = asChild ? React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }> : null
  const contents = <span className="mc-select-item-label"><SelectPrimitive.ItemText>{textSkin(child ? child.props.children : children)}</SelectPrimitive.ItemText></span>
  return <SelectPrimitive.Item data-slot="select-item" asChild={asChild} className={`mc-select-item ${className ?? ""}`} {...props}>{child ? React.cloneElement(child, undefined, contents) : contents}</SelectPrimitive.Item>
}
function SelectLabel({ children, className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) { return <SelectPrimitive.Label data-slot="select-label" className={`mc-select-label ${className ?? ""}`} {...props}>{textSkin(children)}</SelectPrimitive.Label> }
function SelectSeparator({ className, style, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) { return <SelectPrimitive.Separator data-slot="select-separator" className={`mc-select-separator ${className ?? ""}`} style={{ backgroundImage: assets.footer_separator, ...style }} {...props} /> }
function scrollButtonContents(children: React.ReactNode) { return <><span className="mc-button-surface" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</span><span className="mc-button-label">{textSkin(children)}</span></> }
function SelectScrollUpButton({ children = "^", className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) { return <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up-button" className={`mc-button mc-select-scroll-button ${className ?? ""}`} {...props}>{scrollButtonContents(children)}</SelectPrimitive.ScrollUpButton> }
function SelectScrollDownButton({ children = "v", className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) { return <SelectPrimitive.ScrollDownButton data-slot="select-scroll-down-button" className={`mc-button mc-select-scroll-button ${className ?? ""}`} {...props}>{scrollButtonContents(children)}</SelectPrimitive.ScrollDownButton> }

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton }
export type { SelectTriggerProps }
