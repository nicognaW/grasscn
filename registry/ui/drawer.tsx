"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { Button } from "./button"
import { MinecraftDialogBackdrop } from "./minecraft-dialog-backdrop"
import { MinecraftSurface } from "./minecraft-surface"
import { CardScaleContext } from "./minecraft-card-text"
import { minecraftCardSprite } from "./minecraft-card-sprite"
import { MinecraftDisclosureText } from "./minecraft-disclosure-text"
import "./minecraft-card.css"
import "./minecraft-drawer.css"

const DrawerScale = React.createContext<1 | 2 | 3>(2)
const DrawerDirection=React.createContext<"top"|"right"|"bottom"|"left">("bottom")
function Drawer({scale=2,direction="bottom",...props}:React.ComponentProps<typeof DrawerPrimitive.Root>&{scale?:1|2|3}) {return <DrawerScale.Provider value={scale}><DrawerDirection.Provider value={direction}><DrawerPrimitive.Root direction={direction} {...props}/></DrawerDirection.Provider></DrawerScale.Provider>}
function DrawerTrigger({asChild,children,...props}:React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
 const scale=React.useContext(DrawerScale)
 return asChild?<DrawerPrimitive.Trigger data-slot="drawer-trigger" asChild {...props}>{children}</DrawerPrimitive.Trigger>:<DrawerPrimitive.Trigger asChild><Button data-slot="drawer-trigger" scale={scale} {...props}>{children}</Button></DrawerPrimitive.Trigger>
}
function DrawerClose({asChild,children="Done",...props}:React.ComponentProps<typeof DrawerPrimitive.Close>) {
 const scale=React.useContext(DrawerScale)
 return asChild?<DrawerPrimitive.Close data-slot="drawer-close" asChild {...props}>{children}</DrawerPrimitive.Close>:<DrawerPrimitive.Close asChild><Button data-slot="drawer-close" scale={scale} {...props}>{children}</Button></DrawerPrimitive.Close>
}
function DrawerPortal(props:React.ComponentProps<typeof DrawerPrimitive.Portal>){return <DrawerPrimitive.Portal {...props}/>}
function DrawerOverlay({className,asChild,children,...props}:React.ComponentProps<typeof DrawerPrimitive.Overlay>){
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null
 const content=<><MinecraftDialogBackdrop/>{child?child.props.children:children}</>
 return <DrawerPrimitive.Overlay data-slot="drawer-overlay" className={`mc-drawer-overlay ${className??""}`} asChild={asChild} {...props}>{child?React.cloneElement(child,undefined,content):content}</DrawerPrimitive.Overlay>
}
type DrawerContentProps=React.ComponentProps<typeof DrawerPrimitive.Content>&{scale?:1|2|3;showCloseButton?:boolean}
function DrawerContent({scale:explicit,showCloseButton=true,asChild,children,className,style,...props}:DrawerContentProps){
 const inherited=React.useContext(DrawerScale),scale=explicit??inherited,side=React.useContext(DrawerDirection)
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null
 const content=<><MinecraftSurface sprite={minecraftCardSprite}/>{child?child.props.children:children}{showCloseButton&&<DrawerClose className="mc-drawer-default-close"/>}</>
 return <DrawerPortal forceMount={props.forceMount}><DrawerOverlay forceMount={props.forceMount}/><DrawerScale.Provider value={scale}><CardScaleContext.Provider value={scale}><DrawerPrimitive.Content data-slot="drawer-content" data-side={side} asChild={asChild} className={`mc-card mc-drawer-content ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{child?React.cloneElement(child,undefined,content):content}</DrawerPrimitive.Content></CardScaleContext.Provider></DrawerScale.Provider></DrawerPortal>
}
function DrawerHeader({className,...props}:React.ComponentProps<"div">){return <div data-slot="drawer-header" className={`mc-drawer-header ${className??""}`} {...props}/>}
function DrawerFooter({className,...props}:React.ComponentProps<"div">){return <div data-slot="drawer-footer" className={`mc-drawer-footer ${className??""}`} {...props}/>}
function DrawerTitle({asChild,children,className,...props}:React.ComponentProps<typeof DrawerPrimitive.Title>){
 const scale=React.useContext(DrawerScale)
 return asChild?<DrawerPrimitive.Title data-slot="drawer-title" asChild className={className} {...props}>{children}</DrawerPrimitive.Title>:<DrawerPrimitive.Title asChild {...props}><MinecraftDisclosureText data-slot="drawer-title" role="heading" aria-level={2} scale={scale} className={className}>{children}</MinecraftDisclosureText></DrawerPrimitive.Title>
}
function DrawerDescription({asChild,children,className,...props}:React.ComponentProps<typeof DrawerPrimitive.Description>){
 const scale=React.useContext(DrawerScale)
 return asChild?<DrawerPrimitive.Description data-slot="drawer-description" asChild className={className} {...props}>{children}</DrawerPrimitive.Description>:<DrawerPrimitive.Description asChild {...props}><MinecraftDisclosureText data-slot="drawer-description" scale={scale} className={className}>{children}</MinecraftDisclosureText></DrawerPrimitive.Description>
}
export {Drawer,DrawerTrigger,DrawerClose,DrawerContent,DrawerHeader,DrawerFooter,DrawerTitle,DrawerDescription,DrawerPortal,DrawerOverlay}
export type {DrawerContentProps}
