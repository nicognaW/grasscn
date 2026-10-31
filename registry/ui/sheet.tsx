"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { Button } from "./button"
import { MinecraftDialogBackdrop } from "./minecraft-dialog-backdrop"
import { MinecraftSurface } from "./minecraft-surface"
import { CardScaleContext } from "./minecraft-card-text"
import { minecraftCardSprite } from "./minecraft-card-sprite"
import { MinecraftDisclosureText } from "./minecraft-disclosure-text"
import "./minecraft-card.css"
import "./minecraft-sheet.css"

const SheetScale = React.createContext<1 | 2 | 3>(2)
function Sheet({scale=2,...props}:React.ComponentProps<typeof SheetPrimitive.Root>&{scale?:1|2|3}) {return <SheetScale.Provider value={scale}><SheetPrimitive.Root {...props}/></SheetScale.Provider>}
function SheetTrigger({asChild,children,...props}:React.ComponentProps<typeof SheetPrimitive.Trigger>) {
 const scale=React.useContext(SheetScale)
 return asChild?<SheetPrimitive.Trigger data-slot="sheet-trigger" asChild {...props}>{children}</SheetPrimitive.Trigger>:<SheetPrimitive.Trigger asChild><Button data-slot="sheet-trigger" scale={scale} {...props}>{children}</Button></SheetPrimitive.Trigger>
}
function SheetClose({asChild,children="Done",...props}:React.ComponentProps<typeof SheetPrimitive.Close>) {
 const scale=React.useContext(SheetScale)
 return asChild?<SheetPrimitive.Close data-slot="sheet-close" asChild {...props}>{children}</SheetPrimitive.Close>:<SheetPrimitive.Close asChild><Button data-slot="sheet-close" scale={scale} {...props}>{children}</Button></SheetPrimitive.Close>
}
function SheetPortal(props:React.ComponentProps<typeof SheetPrimitive.Portal>){return <SheetPrimitive.Portal {...props}/>}
function SheetOverlay({className,asChild,children,...props}:React.ComponentProps<typeof SheetPrimitive.Overlay>){
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null
 const content=<><MinecraftDialogBackdrop/>{child?child.props.children:children}</>
 return <SheetPrimitive.Overlay data-slot="sheet-overlay" className={`mc-sheet-overlay ${className??""}`} asChild={asChild} {...props}>{child?React.cloneElement(child,undefined,content):content}</SheetPrimitive.Overlay>
}
type SheetContentProps=React.ComponentProps<typeof SheetPrimitive.Content>&{side?:"top"|"right"|"bottom"|"left";scale?:1|2|3;showCloseButton?:boolean}
function SheetContent({side="right",scale:explicit,showCloseButton=true,asChild,children,className,style,...props}:SheetContentProps){
 const inherited=React.useContext(SheetScale),scale=explicit??inherited
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null
 const content=<><MinecraftSurface sprite={minecraftCardSprite}/>{child?child.props.children:children}{showCloseButton&&<SheetClose className="mc-sheet-default-close"/>}</>
 return <SheetPortal forceMount={props.forceMount}><SheetOverlay forceMount={props.forceMount}/><SheetScale.Provider value={scale}><CardScaleContext.Provider value={scale}><SheetPrimitive.Content data-slot="sheet-content" data-side={side} asChild={asChild} className={`mc-card mc-sheet-content ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{child?React.cloneElement(child,undefined,content):content}</SheetPrimitive.Content></CardScaleContext.Provider></SheetScale.Provider></SheetPortal>
}
function SheetHeader({className,...props}:React.ComponentProps<"div">){return <div data-slot="sheet-header" className={`mc-sheet-header ${className??""}`} {...props}/>}
function SheetFooter({className,...props}:React.ComponentProps<"div">){return <div data-slot="sheet-footer" className={`mc-sheet-footer ${className??""}`} {...props}/>}
function SheetTitle({asChild,children,className,...props}:React.ComponentProps<typeof SheetPrimitive.Title>){
 const scale=React.useContext(SheetScale)
 return asChild?<SheetPrimitive.Title data-slot="sheet-title" asChild className={className} {...props}>{children}</SheetPrimitive.Title>:<SheetPrimitive.Title asChild {...props}><MinecraftDisclosureText data-slot="sheet-title" role="heading" aria-level={2} scale={scale} className={className}>{children}</MinecraftDisclosureText></SheetPrimitive.Title>
}
function SheetDescription({asChild,children,className,...props}:React.ComponentProps<typeof SheetPrimitive.Description>){
 const scale=React.useContext(SheetScale)
 return asChild?<SheetPrimitive.Description data-slot="sheet-description" asChild className={className} {...props}>{children}</SheetPrimitive.Description>:<SheetPrimitive.Description asChild {...props}><MinecraftDisclosureText data-slot="sheet-description" scale={scale} className={className}>{children}</MinecraftDisclosureText></SheetPrimitive.Description>
}
export {Sheet,SheetTrigger,SheetClose,SheetContent,SheetHeader,SheetFooter,SheetTitle,SheetDescription,SheetPortal,SheetOverlay}
export type {SheetContentProps}
