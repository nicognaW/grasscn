"use client"

import * as React from "react"
import { ContextMenu as Primitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { MinecraftSurface } from "./minecraft-surface"
import { minecraftCardSprite } from "./minecraft-card-sprite"
import { Separator } from "./separator"
import { playMinecraftClick } from "./minecraft-sound"
import { MenuScaleContext, MinecraftMenuText, menuTextNodes } from "./minecraft-menu-text"
import { MinecraftMenuCheckboxSprite } from "./minecraft-menu-checkbox"
import "./minecraft-checkbox.css"
import "./minecraft-menu.css"

type MenuSurface = "popup" | "suggestions"
function ContextMenu({ scale = 2, ...props }: React.ComponentProps<typeof Primitive.Root> & { scale?: 1 | 2 | 3 }) {
  return <MenuScaleContext.Provider value={scale}><Primitive.Root {...props} /></MenuScaleContext.Provider>
}
function ContextMenuPortal(props: React.ComponentProps<typeof Primitive.Portal>) { return <Primitive.Portal data-slot="context-menu-portal" {...props} /> }
function ContextMenuTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="context-menu-trigger" {...props} />
}

function useMenuFrame(ref: React.Ref<HTMLDivElement> | undefined, scale: number, surface: MenuSurface) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const forwarded = React.useCallback((element: HTMLDivElement | null) => {
    setNode(element)
    if (typeof ref === "function") {
      const cleanup = ref(element)
      if (typeof cleanup === "function") return () => { setNode(null); cleanup() }
    } else if (ref) ref.current = element
  }, [ref])
  React.useLayoutEffect(() => {
    if (!node) return
    const items = Array.from(node.children).find(child => child.classList.contains("mc-menu-items")) as HTMLElement | undefined
    if (!items) return
    let frame = 0
    const measure = () => {
      if (!node.clientWidth || !node.clientHeight) return
      node.dataset.mcMenuScrollable = String(node.scrollHeight > node.clientHeight + .5)
      const style = getComputedStyle(node), padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const maximum = Math.max(0, node.scrollHeight - node.clientHeight)
      node.dataset.mcMenuAbove = String(node.scrollTop > .5)
      node.dataset.mcMenuBelow = String(node.scrollTop < maximum - .5)
      const values = { "--mc-menu-scroll-px": `${node.scrollTop}px`, "--mc-menu-frame-height": `${node.clientHeight}px`, "--mc-menu-frame-width": `${node.clientWidth}px`, "--mc-menu-clip-top": `${node.scrollTop}px`, "--mc-menu-clip-bottom": `${Math.max(0, items.offsetHeight - node.scrollTop - (node.clientHeight - padding))}px` }
      for (const [key, value] of Object.entries(values)) if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value)
      cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { node.dataset.mcMenuReady = "true" })
    }
    const resize = new ResizeObserver(measure), mutation = new MutationObserver(measure)
    resize.observe(node); resize.observe(items)
    mutation.observe(items, { subtree: true, childList: true, characterData: true })
    node.addEventListener("scroll", measure, { passive: true }); window.addEventListener("resize", measure)
    measure()
    return () => { resize.disconnect(); mutation.disconnect(); node.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); cancelAnimationFrame(frame) }
  }, [node, scale, surface])
  return forwarded
}
function contentChildren(children: React.ReactNode, asChild: boolean | undefined, surface: MenuSurface) {
  const child = asChild ? React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }> : null
  const content = <>{surface === "popup" && <span className="mc-menu-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite} /></span>}<div className="mc-menu-items">{child ? child.props.children : children}</div><span className="mc-menu-scroll-hint" data-edge="top" aria-hidden="true" /><span className="mc-menu-scroll-hint" data-edge="bottom" aria-hidden="true" /></>
  return child ? React.cloneElement(child, undefined, content) : content
}
type ContextMenuContentProps = React.ComponentProps<typeof Primitive.Content> & { scale?: 1 | 2 | 3; surface?: MenuSurface }
function ContextMenuContent({ children, className, scale: explicitScale, surface = "popup", asChild, style, ref, ...props }: ContextMenuContentProps) {
  const inherited = React.useContext(MenuScaleContext), scale = explicitScale ?? inherited
  const forwarded = useMenuFrame(ref, scale, surface)
  return <Primitive.Portal forceMount={props.forceMount}><MenuScaleContext.Provider value={scale}><Primitive.Content data-slot="context-menu-content" data-surface={surface} asChild={asChild} ref={forwarded} className={cn("mc-menu-content", className)} style={{ "--mc-scale": scale, "--radix-dropdown-menu-content-available-width": "var(--radix-context-menu-content-available-width)", "--radix-dropdown-menu-content-available-height": "var(--radix-context-menu-content-available-height)", ...style } as React.CSSProperties} {...props}>{contentChildren(children, asChild, surface)}</Primitive.Content></MenuScaleContext.Provider></Primitive.Portal>
}
function ContextMenuGroup(props: React.ComponentProps<typeof Primitive.Group>) { return <Primitive.Group data-slot="context-menu-group" {...props} /> }
function rowChildren(children: React.ReactNode, asChild: boolean | undefined, before?: React.ReactNode, after?: React.ReactNode) {
  if (!asChild) return <>{before}{menuTextNodes(children)}{after}</>
  const child = React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }>
  return React.cloneElement(child, undefined, before, menuTextNodes(child.props.children), after)
}
type ContextMenuItemProps = React.ComponentProps<typeof Primitive.Item> & { inset?: boolean; variant?: "default" }
function ContextMenuItem({ children, className, inset, variant = "default", asChild, style, ...props }: ContextMenuItemProps) {
  const scale = React.useContext(MenuScaleContext)
  if (variant !== "default") throw new Error("Minecraft menu items support the default visual variant only")
  return <Primitive.Item data-slot="context-menu-item" data-inset={inset} asChild={asChild} className={cn("mc-menu-item", className)} style={{ "--mc-scale": scale, "--radix-dropdown-menu-content-available-width": "var(--radix-context-menu-content-available-width)", "--radix-dropdown-menu-content-available-height": "var(--radix-context-menu-content-available-height)", ...style } as React.CSSProperties} {...props}>{rowChildren(children, asChild)}</Primitive.Item>
}
function checkboxIcon(scale: 1 | 2 | 3) {
  return <Primitive.ItemIndicator forceMount aria-hidden="true" className="mc-checkbox mc-menu-check" style={{ "--mc-scale": scale, "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`, "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`, "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`, "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})` } as React.CSSProperties}><MinecraftMenuCheckboxSprite /><span className="mc-checkbox-indicator" /></Primitive.ItemIndicator>
}
function ContextMenuCheckboxItem({ children, className, asChild, style, onCheckedChange, ...props }: React.ComponentProps<typeof Primitive.CheckboxItem>) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.CheckboxItem data-slot="context-menu-checkbox-item" asChild={asChild} className={cn("mc-menu-item mc-menu-checkbox-item", className)} style={{ "--mc-scale": scale, "--radix-dropdown-menu-content-available-width": "var(--radix-context-menu-content-available-width)", "--radix-dropdown-menu-content-available-height": "var(--radix-context-menu-content-available-height)", ...style } as React.CSSProperties} onCheckedChange={next => { onCheckedChange?.(next); if (!props.disabled) playMinecraftClick() }} {...props}>{rowChildren(children, asChild, checkboxIcon(scale))}</Primitive.CheckboxItem>
}
function ContextMenuRadioGroup(props: React.ComponentProps<typeof Primitive.RadioGroup>) { return <Primitive.RadioGroup data-slot="context-menu-radio-group" {...props} /> }
function ContextMenuRadioItem({ children, className, asChild, style, onSelect, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.RadioItem data-slot="context-menu-radio-item" asChild={asChild} className={cn("mc-menu-item mc-menu-checkbox-item", className)} style={{ "--mc-scale": scale, "--radix-dropdown-menu-content-available-width": "var(--radix-context-menu-content-available-width)", "--radix-dropdown-menu-content-available-height": "var(--radix-context-menu-content-available-height)", ...style } as React.CSSProperties} onSelect={event => { onSelect?.(event); if (!props.disabled) playMinecraftClick() }} {...props}>{rowChildren(children, asChild, checkboxIcon(scale))}</Primitive.RadioItem>
}
function ContextMenuLabel({ children, className, inset, asChild, style, ...props }: React.ComponentProps<typeof Primitive.Label> & { inset?: boolean }) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.Label data-slot="context-menu-label" data-inset={inset} asChild={asChild} className={cn("mc-menu-item mc-menu-label", className)} style={{ "--mc-scale": scale, "--radix-dropdown-menu-content-available-width": "var(--radix-context-menu-content-available-width)", "--radix-dropdown-menu-content-available-height": "var(--radix-context-menu-content-available-height)", ...style } as React.CSSProperties} {...props}>{rowChildren(children, asChild)}</Primitive.Label>
}
function ContextMenuSeparator({ className, style, asChild, children, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.Separator data-slot="context-menu-separator" asChild className={cn("mc-menu-separator", className)} style={style} {...props}>{asChild ? children : <Separator scale={scale} decorative={false} />}</Primitive.Separator>
}
function ContextMenuShortcut({ children, className, ...props }: React.ComponentProps<"span">) { return <span data-slot="context-menu-shortcut" className={cn("mc-menu-shortcut", className)} {...props}>{menuTextNodes(children)}</span> }
function ContextMenuSub(props: React.ComponentProps<typeof Primitive.Sub>) { return <Primitive.Sub data-slot="context-menu-sub" {...props} /> }
function ContextMenuSubTrigger({ children, className, inset, asChild, style, ...props }: React.ComponentProps<typeof Primitive.SubTrigger> & { inset?: boolean }) {
  const scale = React.useContext(MenuScaleContext)
  const arrow = <span className="mc-menu-arrow" aria-hidden="true"><span className="mc-menu-arrow-ltr"><MinecraftMenuText>{">"}</MinecraftMenuText></span><span className="mc-menu-arrow-rtl"><MinecraftMenuText>{"<"}</MinecraftMenuText></span></span>
  return <Primitive.SubTrigger data-slot="context-menu-sub-trigger" data-inset={inset} asChild={asChild} className={cn("mc-menu-item mc-menu-sub-trigger", className)} style={{ "--mc-scale": scale, "--radix-dropdown-menu-content-available-width": "var(--radix-context-menu-content-available-width)", "--radix-dropdown-menu-content-available-height": "var(--radix-context-menu-content-available-height)", ...style } as React.CSSProperties} {...props}>{rowChildren(children, asChild, undefined, arrow)}</Primitive.SubTrigger>
}
type ContextMenuSubContentProps = React.ComponentProps<typeof Primitive.SubContent> & { scale?: 1 | 2 | 3; surface?: MenuSurface }
function ContextMenuSubContent({ children, className, scale: explicitScale, surface = "popup", asChild, style, ref, ...props }: ContextMenuSubContentProps) {
  const inherited = React.useContext(MenuScaleContext), scale = explicitScale ?? inherited
  const forwarded = useMenuFrame(ref, scale, surface)
  return <MenuScaleContext.Provider value={scale}><Primitive.SubContent data-slot="context-menu-sub-content" data-surface={surface} asChild={asChild} ref={forwarded} className={cn("mc-menu-content", className)} style={{ "--mc-scale": scale, "--radix-dropdown-menu-content-available-width": "var(--radix-context-menu-content-available-width)", "--radix-dropdown-menu-content-available-height": "var(--radix-context-menu-content-available-height)", ...style } as React.CSSProperties} {...props}>{contentChildren(children, asChild, surface)}</Primitive.SubContent></MenuScaleContext.Provider>
}
export { ContextMenu, ContextMenuPortal, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup, ContextMenuLabel, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent }
export type { ContextMenuContentProps, ContextMenuItemProps, ContextMenuSubContentProps }
