"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"
import { minecraftTabsAssets as assets } from "./minecraft-tabs-assets"
import { minecraftGlyphs } from "./minecraft-font"
import { MinecraftText } from "./minecraft-text"
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label"
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont"
import { tabsUnihexAtlas } from "./minecraft-tabs-atlas"
import { playMinecraftClick } from "./minecraft-sound"
import "./minecraft-tabs.css"

const ScaleContext = React.createContext(2)
function useLocalRef<T extends HTMLElement>(forwarded: React.Ref<T> | undefined) {
  const local = React.useRef<T>(null)
  const [element, setElement] = React.useState<T | null>(null)
  const callback = React.useCallback((node: T | null) => {
    local.current = node
    setElement(node)
    if (typeof forwarded === "function") {
      const cleanup = forwarded(node)
      if (typeof cleanup === "function") return () => { local.current = null; setElement(null); cleanup() }
    } else if (forwarded) forwarded.current = node
  }, [forwarded])
  return [local, callback, element] as const
}

type TabsProps = Omit<React.ComponentProps<typeof TabsPrimitive.Root>, "orientation"> & { orientation?: "horizontal"; scale?: 1 | 2 | 3 }
function Tabs({ className, scale = 2, orientation = "horizontal", style, ref, onValueChange, ...props }: TabsProps) {
  if (orientation !== "horizontal") throw new Error("Minecraft menu tabs support horizontal orientation only")
  const [, forwarded, element] = useLocalRef(ref)
  const requested = React.useRef<string | undefined>(undefined), expiry = React.useRef(0)
  React.useLayoutEffect(() => {
    const root = element
    if (!root) return
    const current = () => Array.from(root.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]')).find(tab => tab.closest(".mc-tabs") === root)?.dataset.mcTabValue
    let previous = current()
    const observer = new MutationObserver(() => {
      const next = current()
      if (next !== previous) {
        if (next !== undefined && requested.current === next) playMinecraftClick()
        requested.current = undefined; previous = next
      }
    })
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] })
    return () => { observer.disconnect(); cancelAnimationFrame(expiry.current) }
  }, [element])
  return <ScaleContext.Provider value={scale}><TabsPrimitive.Root ref={forwarded} data-slot="tabs" orientation={orientation} className={`mc-tabs ${className ?? ""}`} style={{ "--mc-scale": scale, ...style } as React.CSSProperties}
    onValueChange={next => {
      requested.current = next
      cancelAnimationFrame(expiry.current)
      expiry.current = requestAnimationFrame(() => { requested.current = undefined })
      onValueChange?.(next)
    }} {...props} /></ScaleContext.Provider>
}

const tabsListVariants = cva("mc-tabs-list", { variants: { variant: { default: "mc-tabs-list-default" } }, defaultVariants: { variant: "default" } })
type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>
function TabsList({ className, variant = "default", style, ref, children, asChild, ...props }: TabsListProps) {
  if (variant && variant !== "default") throw new Error("Minecraft menu tabs support the default variant only")
  const scale = React.useContext(ScaleContext), [, forwarded, element] = useLocalRef(ref)
  React.useLayoutEffect(() => {
    if (!element) return
    const measure = () => {
      const width = Math.floor(element.clientWidth / scale)
      const count = Math.max(1, element.querySelectorAll(':scope > [data-slot="tabs-trigger"]').length)
      const available = Math.max(0, Math.min(400, width) - 28)
      const tabWidth = Math.ceil(Math.floor(available / count) / 2) * 2
      const left = Math.ceil(Math.floor((width - available) / 2) / 2) * 2
      element.style.setProperty("--mc-tab-width", `${tabWidth * scale}px`)
      element.style.setProperty("--mc-tabs-left", `${left * scale}px`)
      element.style.setProperty("--mc-tabs-end", `${(left + tabWidth * count) * scale}px`)
      element.dataset.mcTabsReady = "true"
    }
    measure()
    const resize = new ResizeObserver(measure), childrenObserver = new MutationObserver(measure)
    resize.observe(element); childrenObserver.observe(element, { childList: true })
    return () => { resize.disconnect(); childrenObserver.disconnect() }
  }, [scale, element])
  let content = children
  if (asChild) {
    const child = React.Children.only(children)
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) throw new Error("TabsList asChild requires one container element")
    content = child.props.children
  }
  return <TabsPrimitive.List ref={forwarded} data-slot="tabs-list" data-variant={variant} asChild={asChild} className={`${tabsListVariants({ variant })} ${className ?? ""}`} style={{ "--mc-tab-header": assets.textures.header_separator, ...style } as React.CSSProperties} {...props}>
    {asChild ? React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, undefined, content) : content}
  </TabsPrimitive.List>
}

function TabSurface({ name }: { name: keyof typeof assets.sprites }) {
  return <span className="mc-tab-surface" data-sprite={name} aria-hidden="true">{assets.sprites[name].pieces.map((image, index) => <i key={index} style={{ backgroundImage: image }} />)}</span>
}
type TabsTriggerProps = React.ComponentProps<typeof TabsPrimitive.Trigger>
function TabsTrigger({ className, style, ref, children, asChild, value, ...props }: TabsTriggerProps) {
  const scale = React.useContext(ScaleContext), [, forwarded, element] = useLocalRef(ref)
  let content = children
  if (asChild) {
    const child = React.Children.only(children)
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) throw new Error("TabsTrigger asChild requires one element")
    content = child.props.children
  }
  const text = typeof content === "string" || typeof content === "number" ? String(content) : null
  React.useLayoutEffect(() => {
    let frame = 0, cancelled = false
    if (!element) return
    const update = () => {
      const width = Math.floor(element.clientWidth / scale)
      const textWidth = text == null ? Math.ceil((element.querySelector<HTMLElement>(".mc-tabs-rich")?.getBoundingClientRect().width ?? 0) / scale) : Math.ceil(Array.from(text).reduce((sum, char) => sum + (minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ?? getUnihexGlyph(char)?.advance ?? 6), 0))
      const overflow = textWidth - (width - 2)
      let left = Math.floor(width / 2) - Math.floor(textWidth / 2)
      if (overflow > 0) {
        const seconds = Date.now() / 1000, period = Math.max(overflow * .5, 3)
        const phase = Math.sin(Math.PI / 2 * Math.cos(Math.PI * 2 * seconds / period)) / 2 + .5
        left = 1 - Math.trunc(phase * overflow)
      }
      const underline = Math.min(textWidth, width - 4)
      element.style.setProperty("--mc-tab-label-x", `${(left - 1) * scale}px`)
      element.style.setProperty("--mc-tab-underline-x", `${Math.floor((width - underline) / 2) * scale}px`)
      element.style.setProperty("--mc-tab-underline-width", `${underline * scale}px`)
      element.dataset.mcTabReady = "true"
      if (!cancelled) frame = requestAnimationFrame(update)
    }
    const unicode = text != null && /[^\x00-\x7f]/.test(text)
    if (unicode) loadUnihex().then(() => { if (!cancelled) update() })
    else update()
    return () => { cancelled = true; cancelAnimationFrame(frame) }
  }, [text, scale, element])
  const artwork = <>
    <TabSurface name="tab" /><TabSurface name="tab_highlighted" /><TabSurface name="tab_selected" /><TabSurface name="tab_selected_highlighted" />
    <span className="mc-tab-menu" aria-hidden="true" style={{ backgroundImage: assets.textures.menu_background }} />
    <span className="mc-tab-underline" aria-hidden="true" />
    <span className="mc-tab-label-window"><span className="mc-tab-label">{text == null ? <span className="mc-tabs-rich">{content}</span> : /^[\x20-\x7e]*$/.test(text) ? <MinecraftText>{text}</MinecraftText> : <MinecraftUnicodeLabel text={text} atlas={tabsUnihexAtlas} />}</span></span>
  </>
  return <TabsPrimitive.Trigger ref={forwarded} value={value} asChild={asChild} data-slot="tabs-trigger" data-mc-tab-value={value} className={`mc-tabs-trigger ${className ?? ""}`} style={style} {...props}>
    {asChild ? React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, undefined, artwork) : artwork}
  </TabsPrimitive.Trigger>
}

function TabsContent({ className, style, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={`mc-tabs-content ${className ?? ""}`} style={{ backgroundImage: assets.textures.menu_background, ...style }} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
export type { TabsProps, TabsListProps, TabsTriggerProps }
