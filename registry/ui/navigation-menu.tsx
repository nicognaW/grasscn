"use client"
import * as React from "react"
import {cva} from "class-variance-authority"
import {NavigationMenu as Primitive} from "radix-ui"
import {cn} from "@/lib/utils"
import {minecraftTabsAssets as assets} from "./minecraft-tabs-assets"
import {minecraftGlyphs} from "./minecraft-font"
import {MinecraftText} from "./minecraft-text"
import {MinecraftUnicodeLabel} from "./minecraft-unicode-label"
import {getUnihexGlyph,loadUnihex} from "./minecraft-unifont"
import {tabsUnihexAtlas} from "./minecraft-tabs-atlas"
import {MinecraftSurface} from "./minecraft-surface"
import {minecraftCardSprite} from "./minecraft-card-sprite"
import {CardScaleContext} from "./minecraft-card-text"
import {PopoverTextContext,MinecraftPopoverText} from "./minecraft-popover-text"
import {MinecraftMenuText,MenuScaleContext,menuTextNodes} from "./minecraft-menu-text"
import {playMinecraftClick} from "./minecraft-sound"
import "./minecraft-card.css"
import "./minecraft-menu.css"
import "./minecraft-navigation-menu.css"
const ScaleContext=React.createContext<1|2|3>(2)
const PanelContext=React.createContext(false)
const ViewportRegistrationContext=React.createContext<()=>()=>void>(()=>()=>{})
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

function NavigationMenu({scale=2,viewport=true,className,style,children,asChild,...props}:React.ComponentProps<typeof Primitive.Root>&{scale?:1|2|3;viewport?:boolean}){
 const [viewportCount,setViewportCount]=React.useState(0)
 const registerViewport=React.useCallback(()=>{setViewportCount(n=>n+1);return()=>setViewportCount(n=>Math.max(0,n-1))},[])
 const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
 const content=<>{child ? child.props.children : children}{viewport&&<NavigationMenuViewport/>}</>
 return <ScaleContext.Provider value={scale}><MenuScaleContext.Provider value={scale}><ViewportRegistrationContext.Provider value={registerViewport}><Primitive.Root data-slot="navigation-menu" data-viewport={viewport} data-mc-navigation-viewport={viewport||viewportCount>0} asChild={asChild} className={cn("mc-navigation-menu",className)} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</Primitive.Root></ViewportRegistrationContext.Provider></MenuScaleContext.Provider></ScaleContext.Provider>
}
function NavigationMenuList({className,style,ref,...props}:React.ComponentProps<typeof Primitive.List>){
 const scale=React.useContext(ScaleContext),[,forwarded,element]=useLocalRef(ref)
 React.useLayoutEffect(()=>{
  if(!element)return
  const measure=()=>{
   const width=Math.floor(element.clientWidth/scale),count=Math.max(1,element.querySelectorAll(':scope > [data-slot="navigation-menu-item"]').length)
   const available=Math.max(0,Math.min(400,width)-28),tabWidth=Math.ceil(Math.floor(available/count)/2)*2,left=Math.ceil(Math.floor((width-available)/2)/2)*2
   element.style.setProperty("--mc-tab-width",`${tabWidth*scale}px`);element.style.setProperty("--mc-tabs-left",`${left*scale}px`);element.style.setProperty("--mc-tabs-end",`${(left+tabWidth*count)*scale}px`);element.dataset.mcTabsReady="true"
  }
  measure();const resize=new ResizeObserver(measure),mutation=new MutationObserver(measure);resize.observe(element);mutation.observe(element,{childList:true});return()=>{resize.disconnect();mutation.disconnect()}
 },[element,scale])
 return <Primitive.List ref={forwarded} data-slot="navigation-menu-list" className={cn("mc-navigation-list",className)} style={{"--mc-tab-header":assets.textures.header_separator,...style} as React.CSSProperties} {...props}/>
}
function NavigationMenuItem({className,...props}:React.ComponentProps<typeof Primitive.Item>){return <Primitive.Item data-slot="navigation-menu-item" className={cn("mc-navigation-item",className)} {...props}/>}
const navigationMenuTriggerStyle=cva("mc-navigation-tab")
function TabSurface({ name }: { name: keyof typeof assets.sprites }) {
  return <span className="mc-tab-surface" data-sprite={name} aria-hidden="true">{assets.sprites[name].pieces.map((image, index) => <i key={index} style={{ backgroundImage: image }} />)}</span>
}
function useArtwork<T extends HTMLElement>(children:React.ReactNode,asChild:boolean|undefined,ref:React.Ref<T>|undefined){
 const scale=React.useContext(ScaleContext),[,forwarded,element]=useLocalRef<T>(ref)
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

 const requested=React.useRef(false),expiry=React.useRef(0)
 React.useLayoutEffect(()=>{
  if(!element)return
  let previous=element.getAttribute("data-state")
  const observer=new MutationObserver(()=>{const next=element.getAttribute("data-state");if(next!==previous){if(requested.current)playMinecraftClick();requested.current=false;previous=next}})
  observer.observe(element,{attributes:true,attributeFilter:["data-state"]})
  return()=>{observer.disconnect();cancelAnimationFrame(expiry.current)}
 },[element])
 const requestClickSound=()=>{requested.current=true;cancelAnimationFrame(expiry.current);expiry.current=requestAnimationFrame(()=>{requested.current=false})}
 return {forwarded,artwork,requestClickSound}
}
function NavigationMenuTrigger({children,asChild,className,ref,onClick,...props}:React.ComponentProps<typeof Primitive.Trigger>){
 const {forwarded,artwork,requestClickSound}=useArtwork(children,asChild,ref)
 return <Primitive.Trigger ref={forwarded as React.Ref<HTMLButtonElement>} data-slot="navigation-menu-trigger" asChild={asChild} className={cn(navigationMenuTriggerStyle(),className)} onClick={event=>{onClick?.(event);if(!event.defaultPrevented&&!props.disabled&&!event.currentTarget.classList.contains("mc-button"))requestClickSound()}} {...props}>{asChild ? React.cloneElement(children as React.ReactElement<{children?:React.ReactNode}>,undefined,artwork) : artwork}</Primitive.Trigger>
}
function NavigationMenuLink({children,asChild,className,active,ref,onClick,onFocus,onBlur,onPointerEnter,onPointerLeave,...props}:React.ComponentProps<typeof Primitive.Link>){
 const panel=React.useContext(PanelContext),tab=!panel||className?.split(/\s+/).includes("mc-navigation-tab"),[hover,setHover]=React.useState(false),[focused,setFocused]=React.useState(false)
 const {forwarded,artwork,requestClickSound}=useArtwork(children,asChild,ref)
 const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
 const content=tab ? artwork : menuTextNodes(child ? child.props.children : children)
 return <Primitive.Link ref={forwarded as React.Ref<HTMLAnchorElement>} data-slot="navigation-menu-link" data-state={active ? "open":"closed"} data-highlighted={active||hover||focused ? "":undefined} active={active} asChild={asChild} className={cn(tab ? navigationMenuTriggerStyle():"mc-menu-item",className)} onClick={event=>{onClick?.(event);if(tab&&!event.defaultPrevented&&props["aria-disabled"]!==true&&props["aria-disabled"]!=="true"&&!event.currentTarget.classList.contains("mc-button"))requestClickSound()}} onFocus={e=>{onFocus?.(e);if(!e.defaultPrevented)setFocused(true)}} onBlur={e=>{onBlur?.(e);setFocused(false)}} onPointerEnter={e=>{onPointerEnter?.(e);if(!e.defaultPrevented)setHover(true)}} onPointerLeave={e=>{onPointerLeave?.(e);setHover(false)}} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</Primitive.Link>
}
function navigationText(children:React.ReactNode,bold=false):React.ReactNode {
 return React.Children.map(children,child=>{
  if(typeof child==="string"||typeof child==="number")return <MinecraftPopoverText bold={bold}>{child}</MinecraftPopoverText>
  if(!React.isValidElement<{children?:React.ReactNode}>(child)||typeof child.type!=="string"&&child.type!==React.Fragment)return child
  const nodes=React.Children.toArray(child.props.children),scalar=nodes.some(node=>typeof node==="string"||typeof node==="number"),elements=nodes.some(node=>React.isValidElement(node))
  // Keep mixed inline content in its consumer-supplied layout.
  if(scalar&&elements)return child
  if(typeof child.type==="string"&&!/^(div|section|article|header|footer|p|h[1-6]|label|li)$/.test(child.type))return child
  return React.cloneElement(child,undefined,navigationText(child.props.children,typeof child.type==="string"&&/^h[1-6]$/.test(child.type)||bold))
 })
}
type NavigationMenuContentProps=React.ComponentProps<typeof Primitive.Content>&{scale?:1|2|3;surface?:"popup"|"suggestions"}
function useMenuFrame(ref: React.Ref<HTMLDivElement> | undefined, scale: number, surface: "popup"|"suggestions") {
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
function NavigationMenuContent({children,asChild,className,ref,scale:explicitScale,surface="popup",style,...props}:NavigationMenuContentProps){
 const inherited=React.useContext(ScaleContext),scale=explicitScale??inherited,[,forwarded,element]=useLocalRef(ref),[width,setWidth]=React.useState(214)
 const frameRef=useMenuFrame(forwarded,scale,surface)
 useNavigationPlacement(element,false)
 React.useLayoutEffect(()=>{if(!element)return;let frame=0;const measure=()=>{const computed=getComputedStyle(element);setWidth(Math.max(1,Math.floor((element.clientWidth-parseFloat(computed.paddingLeft)-parseFloat(computed.paddingRight))/scale)));cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{element.dataset.mcNavigationContentReady="true"})};const resize=new ResizeObserver(measure);resize.observe(element);measure();return()=>{resize.disconnect();cancelAnimationFrame(frame)}},[element,scale])
 const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null,text=child ? child.props.children : children
 const body=<>{surface==="popup"&&<span className="mc-menu-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite}/></span>}<div className="mc-menu-items">{navigationText(text)}</div><span className="mc-menu-scroll-hint" data-edge="top" aria-hidden="true"/><span className="mc-menu-scroll-hint" data-edge="bottom" aria-hidden="true"/></>
 const provided=<ScaleContext.Provider value={scale}><MenuScaleContext.Provider value={scale}><CardScaleContext.Provider value={scale}><PopoverTextContext.Provider value={{scale,width}}><PanelContext.Provider value>{body}</PanelContext.Provider></PopoverTextContext.Provider></CardScaleContext.Provider></MenuScaleContext.Provider></ScaleContext.Provider>
 return <Primitive.Content ref={frameRef} data-slot="navigation-menu-content" data-surface={surface} asChild={asChild} className={cn("mc-card mc-menu-content mc-navigation-content",className)} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{child ? React.cloneElement(child,undefined,provided) : provided}</Primitive.Content>
}
function useNavigationPlacement(element:HTMLElement|null,viewport:boolean){
 React.useLayoutEffect(()=>{
  if(!element||(!viewport&&element.closest<HTMLElement>('[data-slot="navigation-menu"]')?.dataset.mcNavigationViewport!=="false"))return
  let frame=0
  const measure=()=>{
   const root=element.closest<HTMLElement>('[data-slot="navigation-menu"]')
   if(root&&element.offsetWidth&&element.offsetHeight){
    const bounds=root.getBoundingClientRect(),scale=Number(getComputedStyle(root).getPropertyValue("--mc-scale"))||2,margin=2*scale
    const x=Math.max(8-bounds.left,Math.min(0,innerWidth-8-bounds.left-element.offsetWidth))
    const below=innerHeight-8-bounds.bottom-margin,above=bounds.top-8-margin,flip=element.offsetHeight>below&&above>below
    const values={"--mc-navigation-collision-left":`${x}px`,"--mc-navigation-collision-top":flip ? `${-element.offsetHeight-2*margin}px`:"100%","--mc-navigation-available-height":`${Math.max(1,flip ? above:below)}px`}
    for(const [key,value] of Object.entries(values))if(element.style.getPropertyValue(key)!==value)element.style.setProperty(key,value)
    element.dataset.mcNavigationViewportReady="true"
   }
   frame=requestAnimationFrame(measure)
  }
  measure();return()=>cancelAnimationFrame(frame)
 },[element,viewport])
}
function NavigationMenuViewport({className,ref,...props}:React.ComponentProps<typeof Primitive.Viewport>){
 const [,forwarded,element]=useLocalRef(ref),register=React.useContext(ViewportRegistrationContext)
 React.useLayoutEffect(()=>register(),[register])
 useNavigationPlacement(element,true)
 return <Primitive.Viewport ref={forwarded} data-slot="navigation-menu-viewport" className={cn("mc-navigation-viewport",className)} {...props}/>
}
function NavigationMenuIndicator({className,ref,children,...props}:React.ComponentProps<typeof Primitive.Indicator>){
 const [,forwarded,element]=useLocalRef(ref)
 React.useLayoutEffect(()=>{if(!element)return;let frame=0;const tick=()=>{const root=element.closest('[data-slot="navigation-menu"]'),trigger=root?.querySelector<HTMLElement>('[data-slot="navigation-menu-trigger"][data-state="open"]');if(trigger){const style=getComputedStyle(trigger);element.style.setProperty("--mc-indicator-left",style.getPropertyValue("--mc-tab-underline-x"));element.style.setProperty("--mc-indicator-width",style.getPropertyValue("--mc-tab-underline-width"));element.style.setProperty("--mc-indicator-ink",style.getPropertyValue("--mc-ink")||style.color)}frame=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(frame)},[element])
 return <Primitive.Indicator ref={forwarded} data-slot="navigation-menu-indicator" className={cn("mc-navigation-indicator",className)} {...props}>{children??<span aria-hidden="true"/>}</Primitive.Indicator>
}
export {NavigationMenu,NavigationMenuList,NavigationMenuItem,NavigationMenuContent,NavigationMenuTrigger,NavigationMenuLink,NavigationMenuIndicator,NavigationMenuViewport,navigationMenuTriggerStyle}
export type {NavigationMenuContentProps}
