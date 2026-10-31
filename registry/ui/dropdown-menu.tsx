"use client"

import * as React from "react"
import { DropdownMenu as Primitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { MinecraftSurface } from "./minecraft-surface"
import { minecraftCardSprite } from "./minecraft-card-sprite"
import { Separator } from "./separator"
import { playMinecraftClick } from "./minecraft-sound"
import { MenuScaleContext, MinecraftMenuText, menuTextNodes } from "./minecraft-menu-text"
import { MinecraftMenuCheckboxSprite } from "./minecraft-menu-checkbox"
import "./minecraft-checkbox.css"
import "./minecraft-menu.css"

type MenuSurface = "popup" | "suggestions"
function DropdownMenu({ scale = 2, ...props }: React.ComponentProps<typeof Primitive.Root> & { scale?: 1 | 2 | 3 }) {
  return <MenuScaleContext.Provider value={scale}><Primitive.Root {...props} /></MenuScaleContext.Provider>
}
function DropdownMenuPortal(props: React.ComponentProps<typeof Primitive.Portal>) { return <Primitive.Portal data-slot="dropdown-menu-portal" {...props} /> }
function DropdownMenuTrigger({ asChild, children, onKeyDown, onPointerDown, onClick, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  const scale = React.useContext(MenuScaleContext)
  const gesture = React.useRef<{ cancel: () => void } | null>(null)
  React.useEffect(() => () => gesture.current?.cancel(), [])
  return <Primitive.Trigger data-slot="dropdown-menu-trigger" asChild {...props} onKeyDown={event => {
    onKeyDown?.(event)
    // Radix prevents the button's synthesized Enter/Space click when opening.
    if (!event.defaultPrevented && !props.disabled && !event.currentTarget.disabled && (!asChild || event.currentTarget.classList.contains("mc-button")) && ["Enter", " "].includes(event.key)) playMinecraftClick()
  }} onPointerDown={event => {
    onPointerDown?.(event)
    if (event.defaultPrevented || props.disabled || event.currentTarget.disabled || event.button !== 0 || event.ctrlKey || (asChild && !event.currentTarget.classList.contains("mc-button"))) return
    gesture.current?.cancel()
    const target = event.currentTarget, document = target.ownerDocument, pointer = event.pointerId
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancel = () => { document.removeEventListener("pointerup", complete, true); document.removeEventListener("pointercancel", cancel); clearTimeout(timer); if (gesture.current?.cancel === cancel) gesture.current = null }
    const complete = (up: PointerEvent) => {
      if (up.pointerId !== pointer) return
      // Modal opening can block the subsequent click. Let an actual click use
      // Button's voice; supply the missing voice only after the pointer ends.
      timer = setTimeout(() => { cancel(); playMinecraftClick() }, 0)
    }
    gesture.current = { cancel }
    document.addEventListener("pointerup", complete, true)
    document.addEventListener("pointercancel", cancel, { once: true })
  }} onClick={event => { gesture.current?.cancel(); onClick?.(event) }}>{asChild ? children : <Button scale={scale}>{children}</Button>}</Primitive.Trigger>
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
type DropdownMenuContentProps = React.ComponentProps<typeof Primitive.Content> & { scale?: 1 | 2 | 3; surface?: MenuSurface }
function DropdownMenuContent({ children, className, sideOffset = 4, scale: explicitScale, surface = "popup", asChild, style, ref, ...props }: DropdownMenuContentProps) {
  const inherited = React.useContext(MenuScaleContext), scale = explicitScale ?? inherited
  const forwarded = useMenuFrame(ref, scale, surface)
  return <Primitive.Portal forceMount={props.forceMount}><MenuScaleContext.Provider value={scale}><Primitive.Content data-slot="dropdown-menu-content" data-surface={surface} asChild={asChild} ref={forwarded} sideOffset={sideOffset} className={cn("mc-menu-content", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>{contentChildren(children, asChild, surface)}</Primitive.Content></MenuScaleContext.Provider></Primitive.Portal>
}
function DropdownMenuGroup(props: React.ComponentProps<typeof Primitive.Group>) { return <Primitive.Group data-slot="dropdown-menu-group" {...props} /> }
function rowChildren(children: React.ReactNode, asChild: boolean | undefined, before?: React.ReactNode, after?: React.ReactNode) {
  if (!asChild) return <>{before}{menuTextNodes(children)}{after}</>
  const child = React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }>
  return React.cloneElement(child, undefined, before, menuTextNodes(child.props.children), after)
}
type DropdownMenuItemProps = React.ComponentProps<typeof Primitive.Item> & { inset?: boolean; variant?: "default" }
function DropdownMenuItem({ children, className, inset, variant = "default", asChild, style, ...props }: DropdownMenuItemProps) {
  const scale = React.useContext(MenuScaleContext)
  if (variant !== "default") throw new Error("Minecraft menu items support the default visual variant only")
  return <Primitive.Item data-slot="dropdown-menu-item" data-inset={inset} asChild={asChild} className={cn("mc-menu-item", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>{rowChildren(children, asChild)}</Primitive.Item>
}
function checkboxIcon(scale: 1 | 2 | 3) {
  return <Primitive.ItemIndicator forceMount aria-hidden="true" className="mc-checkbox mc-menu-check" style={{ "--mc-scale": scale, "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`, "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`, "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`, "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})` } as React.CSSProperties}><MinecraftMenuCheckboxSprite /><span className="mc-checkbox-indicator" /></Primitive.ItemIndicator>
}
function DropdownMenuCheckboxItem({ children, className, asChild, style, onCheckedChange, ...props }: React.ComponentProps<typeof Primitive.CheckboxItem>) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" asChild={asChild} className={cn("mc-menu-item mc-menu-checkbox-item", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} onCheckedChange={next => { onCheckedChange?.(next); if (!props.disabled) playMinecraftClick() }} {...props}>{rowChildren(children, asChild, checkboxIcon(scale))}</Primitive.CheckboxItem>
}
function DropdownMenuRadioGroup(props: React.ComponentProps<typeof Primitive.RadioGroup>) { return <Primitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} /> }
function DropdownMenuRadioItem({ children, className, asChild, style, onSelect, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.RadioItem data-slot="dropdown-menu-radio-item" asChild={asChild} className={cn("mc-menu-item mc-menu-checkbox-item", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} onSelect={event => { onSelect?.(event); if (!props.disabled) playMinecraftClick() }} {...props}>{rowChildren(children, asChild, checkboxIcon(scale))}</Primitive.RadioItem>
}
function DropdownMenuLabel({ children, className, inset, asChild, style, ...props }: React.ComponentProps<typeof Primitive.Label> & { inset?: boolean }) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.Label data-slot="dropdown-menu-label" data-inset={inset} asChild={asChild} className={cn("mc-menu-item mc-menu-label", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>{rowChildren(children, asChild)}</Primitive.Label>
}
function DropdownMenuSeparator({ className, style, asChild, children, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  const scale = React.useContext(MenuScaleContext)
  return <Primitive.Separator data-slot="dropdown-menu-separator" asChild className={cn("mc-menu-separator", className)} style={style} {...props}>{asChild ? children : <Separator scale={scale} decorative={false} />}</Primitive.Separator>
}
function DropdownMenuShortcut({ children, className, ...props }: React.ComponentProps<"span">) { return <span data-slot="dropdown-menu-shortcut" className={cn("mc-menu-shortcut", className)} {...props}>{menuTextNodes(children)}</span> }
function DropdownMenuSub(props: React.ComponentProps<typeof Primitive.Sub>) { return <Primitive.Sub data-slot="dropdown-menu-sub" {...props} /> }
function DropdownMenuSubTrigger({ children, className, inset, asChild, style, ...props }: React.ComponentProps<typeof Primitive.SubTrigger> & { inset?: boolean }) {
  const scale = React.useContext(MenuScaleContext)
  const arrow = <span className="mc-menu-arrow" aria-hidden="true"><span className="mc-menu-arrow-ltr"><MinecraftMenuText>{">"}</MinecraftMenuText></span><span className="mc-menu-arrow-rtl"><MinecraftMenuText>{"<"}</MinecraftMenuText></span></span>
  return <Primitive.SubTrigger data-slot="dropdown-menu-sub-trigger" data-inset={inset} asChild={asChild} className={cn("mc-menu-item mc-menu-sub-trigger", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>{rowChildren(children, asChild, undefined, arrow)}</Primitive.SubTrigger>
}
type DropdownMenuSubContentProps = React.ComponentProps<typeof Primitive.SubContent> & { scale?: 1 | 2 | 3; surface?: MenuSurface }
function DropdownMenuSubContent({ children, className, scale: explicitScale, surface = "popup", asChild, style, ref, ...props }: DropdownMenuSubContentProps) {
  const inherited = React.useContext(MenuScaleContext), scale = explicitScale ?? inherited
  const forwarded = useMenuFrame(ref, scale, surface)
  return <MenuScaleContext.Provider value={scale}><Primitive.SubContent data-slot="dropdown-menu-sub-content" data-surface={surface} asChild={asChild} ref={forwarded} className={cn("mc-menu-content", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>{contentChildren(children, asChild, surface)}</Primitive.SubContent></MenuScaleContext.Provider>
}
export { DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent }
export type { DropdownMenuContentProps, DropdownMenuItemProps, DropdownMenuSubContentProps }
