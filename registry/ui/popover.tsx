"use client"

import * as React from "react"
import { Popover as Primitive } from "radix-ui"
import { Button } from "./button"
import { MinecraftSurface } from "./minecraft-surface"
import { minecraftCardSprite } from "./minecraft-card-sprite"
import { CardScaleContext } from "./minecraft-card-text"
import { PopoverTextContext,MinecraftPopoverText } from "./minecraft-popover-text"
import { minecraftTextareaAssets } from "./minecraft-textarea-assets"
import "./minecraft-card.css"
import "./minecraft-popover.css"

const ScaleContext=React.createContext<1|2|3>(2)
function Popover({scale=2,...props}:React.ComponentProps<typeof Primitive.Root>&{scale?:1|2|3}) {return <ScaleContext.Provider value={scale}><Primitive.Root {...props}/></ScaleContext.Provider>}
function PopoverTrigger({asChild,children,...props}:React.ComponentProps<typeof Primitive.Trigger>) {
  const scale=React.useContext(ScaleContext)
  return asChild ? <Primitive.Trigger data-slot="popover-trigger" asChild {...props}>{children}</Primitive.Trigger> : <Primitive.Trigger data-slot="popover-trigger" asChild><Button scale={scale} {...props}>{children}</Button></Primitive.Trigger>
}
function PopoverAnchor({ref,...props}:React.ComponentProps<typeof Primitive.Anchor>) {
  // Radix registers the trigger before its custom-anchor effect removes the
  // implicit anchor. Reattach after that commit so placement uses this node.
  const [mounted,setMounted]=React.useState(false)
  React.useEffect(()=>setMounted(true),[])
  const forwarded=React.useCallback((node:HTMLDivElement|null)=>{
    if(typeof ref==="function")return ref(node)
    if(ref)ref.current=node
  },[ref,mounted])
  return <Primitive.Anchor data-slot="popover-anchor" {...props} ref={forwarded}/>
}
type PopoverContentProps=React.ComponentProps<typeof Primitive.Content>&{scale?:1|2|3}
function PopoverContent({className,align="center",sideOffset=4,scale:explicitScale,children,asChild,ref,style,...props}:PopoverContentProps) {
  const inherited=React.useContext(ScaleContext),scale=explicitScale??inherited,id=React.useId()
  const [node,setNode]=React.useState<HTMLDivElement|null>(null),[width,setWidth]=React.useState(214)
  const forwarded=React.useCallback((element:HTMLDivElement|null)=>{setNode(element);if(typeof ref==="function"){const cleanup=ref(element);if(typeof cleanup==="function")return()=>{setNode(null);cleanup()}}else if(ref)ref.current=element},[ref])
  React.useLayoutEffect(()=>{
    if(!node)return
    let frame=0
    const measure=()=>{
      const computed=getComputedStyle(node)
      setWidth(Math.max(1,Math.floor((node.clientWidth-parseFloat(computed.paddingLeft)-parseFloat(computed.paddingRight))/scale)))
      const named=(slot:string)=>Array.from(node.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)).find(element=>element.closest('[data-slot="popover-content"]')===node)
      for(const [slot,attribute,suffix]of [["popover-title","aria-labelledby","title"],["popover-description","aria-describedby","description"]]as const){
        if(props[attribute]!==undefined || (attribute==="aria-labelledby"&&props["aria-label"]!==undefined))continue
        const element=named(slot)
        if(element){if(!element.id)element.id=`${id}-${suffix}`;if(node.getAttribute(attribute)!==element.id)node.setAttribute(attribute,element.id)}else node.removeAttribute(attribute)
      }
      cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{node.dataset.mcPopoverReady="true"})
    }
    const resize=new ResizeObserver(measure),mutation=new MutationObserver(measure)
    resize.observe(node);mutation.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["id"]});measure()
    return()=>{resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame)}
  },[node,scale,id,props["aria-labelledby"],props["aria-describedby"],props["aria-label"]])
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const text=child ? child.props.children : children
  const contents=<><span className="mc-popover-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite}/></span>{typeof text==="string"||typeof text==="number" ? <MinecraftPopoverText>{text}</MinecraftPopoverText> : text}</>
  return <Primitive.Portal forceMount={props.forceMount}><ScaleContext.Provider value={scale}><CardScaleContext.Provider value={scale}><PopoverTextContext.Provider value={{scale,width}}><Primitive.Content data-slot="popover-content" align={align} sideOffset={sideOffset} asChild={asChild} ref={forwarded} className={`mc-card mc-popover ${className??""}`} style={{"--mc-scale":scale,"--mc-popover-scroll-thumb":`url("${minecraftTextareaAssets.scroller}")`,"--mc-popover-scroll-track":`url("${minecraftTextareaAssets.scroller_background}")`,...style} as React.CSSProperties} {...props}>{child ? React.cloneElement(child,undefined,contents) : contents}</Primitive.Content></PopoverTextContext.Provider></CardScaleContext.Provider></ScaleContext.Provider></Primitive.Portal>
}
function PopoverHeader({className,...props}:React.ComponentProps<"div">) {return <div data-slot="popover-header" className={`mc-card-header ${className??""}`} {...props}/>}
function PopoverTitle({className,children,...props}:React.ComponentProps<"h2">) {return <h2 data-slot="popover-title" className={`mc-card-title mc-popover-title ${className??""}`} {...props}><MinecraftPopoverText bold>{children}</MinecraftPopoverText></h2>}
function PopoverDescription({className,children,...props}:React.ComponentProps<"p">) {return <p data-slot="popover-description" className={`mc-card-description mc-popover-description ${className??""}`} {...props}><MinecraftPopoverText>{children}</MinecraftPopoverText></p>}
export {Popover,PopoverTrigger,PopoverContent,PopoverAnchor,PopoverHeader,PopoverTitle,PopoverDescription}
export type {PopoverContentProps}
