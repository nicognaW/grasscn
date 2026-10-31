"use client"

import * as React from "react"
import {ToggleGroup as ToggleGroupPrimitive} from "radix-ui"
import {toggleVariants} from "./toggle"
import {playMinecraftClick} from "./minecraft-sound"
import "./minecraft-toggle-group.css"

type Appearance={scale?:1|2|3;variant?:"default";size?:"default"}
type ToggleGroupProps=React.ComponentProps<typeof ToggleGroupPrimitive.Root>&Appearance&{spacing?:number}
type ToggleGroupItemProps=React.ComponentProps<typeof ToggleGroupPrimitive.Item>&Appearance
const AppearanceContext=React.createContext<Appearance&{disabled?:boolean}>({scale:2,variant:"default",size:"default"})

function ToggleGroup({scale=2,variant="default",size="default",spacing=2,className,style,children,disabled,...props}:ToggleGroupProps){
 if(variant!=="default"||size!=="default")throw new Error("Minecraft recipe filters support the default visual variant and size only")
 return <AppearanceContext.Provider value={{scale,variant,size,disabled}}><ToggleGroupPrimitive.Root data-slot="toggle-group" disabled={disabled} className={`mc-toggle-group ${className??""}`} style={{"--mc-scale":scale,"--mc-toggle-spacing":spacing,...style} as React.CSSProperties} {...props}>{children}</ToggleGroupPrimitive.Root></AppearanceContext.Provider>
}

function ToggleGroupItem({scale,variant,size,className,style,disabled,onClick,onPointerDown,...props}:ToggleGroupItemProps){
 const inherited=React.useContext(AppearanceContext),resolvedScale=scale??inherited.scale,resolvedVariant=variant??inherited.variant??"default",resolvedSize=size??inherited.size??"default",resolvedDisabled=disabled||inherited.disabled
 if(resolvedVariant!=="default"||resolvedSize!=="default")throw new Error("Minecraft recipe filters support the default visual variant and size only")
 return <ToggleGroupPrimitive.Item data-slot="toggle-group-item" disabled={resolvedDisabled} className={toggleVariants({variant:resolvedVariant,size:resolvedSize,className})} style={{"--mc-scale":resolvedScale,...style} as React.CSSProperties} {...props} aria-disabled={resolvedDisabled?true:props["aria-disabled"]}
 onPointerDown={event=>{if(resolvedDisabled||event.currentTarget.hasAttribute("data-disabled")){event.preventDefault();return};onPointerDown?.(event)}}
 onClick={event=>{if(resolvedDisabled||event.currentTarget.hasAttribute("data-disabled")||event.currentTarget.getAttribute("aria-disabled")==="true"){event.preventDefault();return};onClick?.(event);if(!event.defaultPrevented)playMinecraftClick()}}/>
}

export {ToggleGroup,ToggleGroupItem}
export type {ToggleGroupProps,ToggleGroupItemProps}
