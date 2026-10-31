"use client"

import * as React from "react"
import {Command as CommandPrimitive} from "cmdk"
import {Input} from "./input"
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogClose} from "./dialog"
import {Button} from "./button"
import {Separator} from "./separator"
import {MinecraftSurface} from "./minecraft-surface"
import {minecraftCardSprite} from "./minecraft-card-sprite"
import {MenuScaleContext,MinecraftMenuText,menuTextNodes} from "./minecraft-menu-text"
import "./minecraft-menu.css"
import "./minecraft-command.css"

type Scale=1|2|3
function Command({scale=2,className,style,...props}:React.ComponentProps<typeof CommandPrimitive>&{scale?:Scale}){
 return <MenuScaleContext.Provider value={scale}><CommandPrimitive data-slot="command" className={`mc-command ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/></MenuScaleContext.Provider>
}
function CommandDialog({title="Command Palette",description="Search for a command to run...",children,className,showCloseButton=true,scale=2,...props}:React.ComponentProps<typeof Dialog>&{title?:string;description?:string;className?:string;showCloseButton?:boolean;scale?:Scale}){
 const wasOpen=React.useRef(false),restoreFocus=React.useRef<HTMLElement|null>(null),isOpen=Boolean(props.open??props.defaultOpen)
 if(isOpen&&!wasOpen.current&&typeof document!=="undefined")restoreFocus.current=document.activeElement as HTMLElement
 wasOpen.current=isOpen
 return <Dialog scale={scale} {...props}><DialogContent className={`mc-command-dialog ${className??""}`} onCloseAutoFocus={event=>{if(restoreFocus.current?.isConnected){event.preventDefault();restoreFocus.current.focus()}}}><DialogHeader className="mc-command-dialog-heading"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><Command scale={scale} data-mc-dialog-item="true">{children}</Command>{showCloseButton&&<DialogClose asChild><Button scale={scale}>Done</Button></DialogClose>}</DialogContent></Dialog>
}
function CommandInput({className,scale:explicit,asChild,children,...props}:React.ComponentProps<typeof CommandPrimitive.Input>&{scale?:Scale}){
 const inherited=React.useContext(MenuScaleContext),scale=explicit??inherited
 return <CommandPrimitive.Input data-slot="command-input" className={className} asChild {...props}>{asChild?children:<Input scale={scale} className="mc-command-input"/>}</CommandPrimitive.Input>
}
function CommandList({className,ref,children,style,asChild,surface="suggestions",...props}:React.ComponentProps<typeof CommandPrimitive.List>&{surface?:"suggestions"|"popup"}){
 const scale=React.useContext(MenuScaleContext),node=React.useRef<HTMLDivElement>(null)
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null
 React.useImperativeHandle(ref,()=>node.current!,[])
 React.useLayoutEffect(()=>{
  const element=node.current!,items=element.querySelector<HTMLElement>('.mc-command-items')
  if(!items)return
  let frame=0
  const measure=()=>{
   if(!element.clientWidth||!element.clientHeight)return
   const maximum=Math.max(0,element.scrollHeight-element.clientHeight)
   element.dataset.mcMenuScrollable=String(maximum>.5);element.dataset.mcMenuAbove=String(element.scrollTop>.5);element.dataset.mcMenuBelow=String(element.scrollTop<maximum-.5)
   const padding=parseFloat(getComputedStyle(element).paddingTop)+parseFloat(getComputedStyle(element).paddingBottom)
   for(const [key,value]of Object.entries({"--mc-menu-scroll-px":`${element.scrollTop}px`,"--mc-menu-frame-height":`${element.clientHeight}px`,"--mc-menu-clip-top":`${element.scrollTop}px`,"--mc-menu-clip-bottom":`${Math.max(0,items.offsetHeight-element.scrollTop-(element.clientHeight-padding))}px`}))if(element.style.getPropertyValue(key)!==value)element.style.setProperty(key,value)
   cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{element.dataset.mcMenuReady='true'})
  }
  const resize=new ResizeObserver(measure),mutation=new MutationObserver(measure);resize.observe(element);resize.observe(items);mutation.observe(items,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});element.addEventListener('scroll',measure,{passive:true});measure()
  return()=>{resize.disconnect();mutation.disconnect();element.removeEventListener('scroll',measure);cancelAnimationFrame(frame)}
 },[scale,surface])
 const contents=<>{surface==="popup"&&<span className="mc-menu-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite}/></span>}<div className="mc-menu-items mc-command-items">{child?child.props.children:children}</div><span className="mc-menu-scroll-hint" data-edge="top" aria-hidden="true"/><span className="mc-menu-scroll-hint" data-edge="bottom" aria-hidden="true"/></>
 return <CommandPrimitive.List data-slot="command-list" data-surface={surface} asChild={asChild} ref={node} className={`mc-menu-content mc-command-list ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{child?React.cloneElement(child,undefined,contents):contents}</CommandPrimitive.List>
}
function CommandEmpty({children,className,...props}:React.ComponentProps<typeof CommandPrimitive.Empty>){return <CommandPrimitive.Empty data-slot="command-empty" className={`mc-command-empty ${className??""}`} {...props}>{menuTextNodes(children)}</CommandPrimitive.Empty>}
function CommandGroup({heading,className,...props}:React.ComponentProps<typeof CommandPrimitive.Group>){return <CommandPrimitive.Group data-slot="command-group" className={`mc-command-group ${className??""}`} heading={heading==null?undefined:<MinecraftMenuText>{heading}</MinecraftMenuText>} {...props}/>}
function CommandItem({children,className,asChild,value,...props}:React.ComponentProps<typeof CommandPrimitive.Item>){
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null
 const content=child?child.props.children:children,inferred=typeof content==='string'||typeof content==='number'?String(content):undefined
 return <CommandPrimitive.Item data-slot="command-item" asChild={asChild} value={value??inferred} className={`mc-command-item ${className??""}`} {...props}>{child?React.cloneElement(child,undefined,menuTextNodes(child.props.children)):menuTextNodes(children)}</CommandPrimitive.Item>
}
function CommandSeparator({className,asChild,children,...props}:React.ComponentProps<typeof CommandPrimitive.Separator>){const scale=React.useContext(MenuScaleContext);return <CommandPrimitive.Separator data-slot="command-separator" asChild {...props}>{asChild?children:<Separator scale={scale} className={`mc-command-separator ${className??""}`}/>}</CommandPrimitive.Separator>}
function CommandShortcut({children,className,...props}:React.ComponentProps<'span'>){return <span data-slot="command-shortcut" className={`mc-command-shortcut ${className??""}`} {...props}>{menuTextNodes(children)}</span>}
export {Command,CommandDialog,CommandInput,CommandList,CommandEmpty,CommandGroup,CommandItem,CommandShortcut,CommandSeparator}
