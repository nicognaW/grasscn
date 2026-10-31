"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "./button"
import { MinecraftSurface } from "./minecraft-surface"
import { minecraftCardSprite } from "./minecraft-card-sprite"
import { DialogLayoutContext, MinecraftDialogText } from "./minecraft-dialog-text"
import { MinecraftDialogBackdrop } from "./minecraft-dialog-backdrop"
import { minecraftTextareaAssets } from "./minecraft-textarea-assets"
import "./minecraft-card.css"
import "./minecraft-dialog.css"

const ScaleContext=React.createContext<1|2|3>(2)
function useElement<T extends HTMLElement>(ref:React.Ref<T>|undefined) {
  const [element,setElement]=React.useState<T|null>(null)
  const callback=React.useCallback((node:T|null)=>{setElement(node);if(typeof ref==="function"){const cleanup=ref(node);if(typeof cleanup==="function")return()=>{setElement(null);cleanup()}}else if(ref)ref.current=node},[ref])
  return [element,callback] as const
}
function Dialog({scale=2,...props}:React.ComponentProps<typeof DialogPrimitive.Root>&{scale?:1|2|3}) {return <ScaleContext.Provider value={scale}><DialogPrimitive.Root {...props}/></ScaleContext.Provider>}
function DialogTrigger({asChild,children,...props}:React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const scale=React.useContext(ScaleContext)
  return asChild ? <DialogPrimitive.Trigger data-slot="dialog-trigger" asChild {...props}>{children}</DialogPrimitive.Trigger> : <DialogPrimitive.Trigger data-slot="dialog-trigger" asChild><Button scale={scale} {...props}>{children}</Button></DialogPrimitive.Trigger>
}
function DialogClose({asChild,children="Done",...props}:React.ComponentProps<typeof DialogPrimitive.Close>) {
  const scale=React.useContext(ScaleContext)
  return asChild ? <DialogPrimitive.Close data-slot="dialog-close" asChild {...props}>{children}</DialogPrimitive.Close> : <DialogPrimitive.Close data-slot="dialog-close" asChild><Button scale={scale} {...props}>{children}</Button></DialogPrimitive.Close>
}
function DialogPortal(props:React.ComponentProps<typeof DialogPrimitive.Portal>) {return <DialogPrimitive.Portal {...props}/>}
function DialogOverlay({className,children,asChild,...props}:React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const content=<><MinecraftDialogBackdrop/>{child ? child.props.children : children}</>
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" asChild={asChild} className={`mc-dialog-overlay ${className??""}`} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</DialogPrimitive.Overlay>
}
type DialogContentProps=React.ComponentProps<typeof DialogPrimitive.Content>&{scale?:1|2|3;width?:number;showCloseButton?:false}
function DialogContent({children,className,scale:explicitScale,width=250,showCloseButton=false,style,ref,asChild,...props}:DialogContentProps) {
  if(showCloseButton)throw new Error("Vanilla PopupScreen closes through its footer actions and Escape")
  const inherited=React.useContext(ScaleContext),scale=explicitScale??inherited,[element,forwarded]=useElement(ref)
  React.useLayoutEffect(()=>{
    if(!element)return
    let frame=0
    const measure=()=>{
      const logicalWidth=element.offsetWidth/scale,logicalHeight=element.offsetHeight/scale
      element.style.setProperty("--mc-dialog-left",`${Math.floor((Math.ceil(innerWidth/scale)-logicalWidth)/2)*scale}px`)
      element.style.setProperty("--mc-dialog-top",`${Math.floor((Math.ceil(innerHeight/scale)-logicalHeight)/2)*scale}px`)
      const bounds=element.getBoundingClientRect(),inside=logicalWidth-36
      for(const node of element.querySelectorAll<HTMLElement>('[data-mc-dialog-item="true"]')) {
        if(node.closest('.mc-dialog-content')!==element)continue
        const rect=node.getBoundingClientRect(),previous=Number(node.dataset.mcDialogShift??0)
        const next=previous+bounds.left+18*scale+Math.floor((inside-rect.width/scale)/2)*scale-rect.left
        node.dataset.mcDialogShift=String(next);node.style.setProperty("--mc-dialog-item-x",`${next}px`)
      }
      element.dataset.mcDialogReady="true"
    }
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)}
    const resize=new ResizeObserver(update),mutation=new MutationObserver(update)
    resize.observe(element);mutation.observe(element,{subtree:true,childList:true,characterData:true});measure()
    window.addEventListener("resize",update)
    return()=>{resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame);window.removeEventListener("resize",update)}
  },[element,scale,width])
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const contents=<><span className="mc-dialog-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite}/></span>{child ? child.props.children : children}</>
  return <DialogPortal forceMount={props.forceMount}><DialogOverlay forceMount={props.forceMount}/><ScaleContext.Provider value={scale}><DialogLayoutContext.Provider value={{scale,contentWidth:Math.max(1,width-36)}}><DialogPrimitive.Content data-slot="dialog-content" asChild={asChild} ref={forwarded} className={`mc-dialog-content ${className??""}`} style={{"--mc-scale":scale,"--mc-dialog-maximum":`${width*scale}px`,"--mc-dialog-scroll-thumb":`url("${minecraftTextareaAssets.scroller}")`,"--mc-dialog-scroll-track":`url("${minecraftTextareaAssets.scroller_background}")`,...style} as React.CSSProperties} {...props}>{child ? React.cloneElement(child,undefined,contents) : contents}</DialogPrimitive.Content></DialogLayoutContext.Provider></ScaleContext.Provider></DialogPortal>
}
function DialogHeader({className,...props}:React.ComponentProps<"div">) {return <div data-slot="dialog-header" className={`mc-dialog-header ${className??""}`} {...props}/>}
function DialogFooter({className,children,ref,showCloseButton=false,...props}:React.ComponentProps<"div">&{showCloseButton?:boolean}) {
  const {scale,contentWidth}=React.useContext(DialogLayoutContext),[element,forwarded]=useElement(ref)
  React.useLayoutEffect(()=>{
    if(!element)return
    const measure=()=>{const count=Math.max(1,element.children.length);element.style.setProperty("--mc-dialog-button-width",`${Math.min(150,Math.floor((contentWidth-6*(count-1))/count))*scale}px`)}
    measure();const observer=new MutationObserver(measure);observer.observe(element,{childList:true});return()=>observer.disconnect()
  },[element,scale,contentWidth])
  return <div data-slot="dialog-footer" data-mc-dialog-item="true" ref={forwarded} className={`mc-dialog-footer ${className??""}`} {...props}>{children}{showCloseButton&&<DialogClose>Close</DialogClose>}</div>
}
function DialogTitle({children,className,asChild,...props}:React.ComponentProps<typeof DialogPrimitive.Title>) {
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const content=<MinecraftDialogText bold>{child ? child.props.children : children}</MinecraftDialogText>
  return <DialogPrimitive.Title data-slot="dialog-title" data-mc-dialog-item="true" asChild={asChild} className={`mc-dialog-title ${className??""}`} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</DialogPrimitive.Title>
}
function DialogDescription({children,className,asChild,...props}:React.ComponentProps<typeof DialogPrimitive.Description>) {
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const text=child ? child.props.children : children
  const content=typeof text==="string" ? text.split("\n\n").map((part,index)=><MinecraftDialogText key={index} item>{part}</MinecraftDialogText>) : <MinecraftDialogText item>{text}</MinecraftDialogText>
  return <DialogPrimitive.Description data-slot="dialog-description" asChild={asChild} className={`mc-dialog-description ${className??""}`} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</DialogPrimitive.Description>
}
export {Dialog,DialogTrigger,DialogPortal,DialogClose,DialogOverlay,DialogContent,DialogHeader,DialogFooter,DialogTitle,DialogDescription}
export type {DialogContentProps}
