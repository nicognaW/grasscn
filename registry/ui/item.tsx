"use client"

import "./minecraft-item.css"

import * as React from "react"
import {Slot} from "radix-ui"
import {cva,type VariantProps} from "class-variance-authority"
import {Separator} from "./separator"
import {playMinecraftClick} from "./minecraft-sound"
import {MinecraftProse} from "./minecraft-prose"
import {MinecraftItemText,type MinecraftItemTextProps} from "./minecraft-item-text"
import {MinecraftItemMedia} from "./minecraft-item-media"

const ItemScale=React.createContext<1|2|3>(2),ItemClipWidth=React.createContext<number|undefined>(undefined),ItemInside=React.createContext(false)
const itemVariants=cva("mc-item",{variants:{variant:{default:""},size:{default:""}},defaultVariants:{variant:"default",size:"default"}})
type ItemProps=React.ComponentProps<"div">&VariantProps<typeof itemVariants>&{asChild?:boolean;scale?:1|2|3;selected?:boolean}
function Item({className,children,asChild,variant="default",size="default",scale:providedScale,selected=false,style,ref,onClick,onClickCapture,onPointerDown,...props}:ItemProps){
 if(variant!=="default"||size!=="default")throw new Error("Minecraft world-list items support the default visual variant and size only")
 const inherited=React.useContext(ItemScale),scale=providedScale??inherited,node=React.useRef<HTMLElement>(null)
 React.useImperativeHandle(ref,()=>node.current! as HTMLDivElement,[])
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null,interactive=asChild||props.role==="button"||props.role==="link",inactive=props["aria-disabled"]===true||props["aria-disabled"]==="true"
 // Custom asChild components retain their own activation audio, avoiding duplicate voices.
 const nativeActivation=(child&&typeof child.type==="string"&&["a","button"].includes(child.type))||props.role==="button"||props.role==="link",Component=asChild?Slot.Root:"div"
 return <ItemScale value={scale}><ItemInside value={true}><Component ref={node as React.Ref<HTMLDivElement>} data-slot="item" data-variant={variant} data-size={size} data-selected={selected?"true":undefined} data-mc-item-interactive={interactive&&!inactive?"true":"false"} className={itemVariants({variant,size,className})} style={{"--mc-scale":scale,...style} as React.CSSProperties}
  {...props} onClickCapture={event=>{if(inactive){event.preventDefault();event.stopPropagation();return}onClickCapture?.(event)}}
  onPointerDown={event=>{if(inactive){event.preventDefault();return}onPointerDown?.(event)}}
  onClick={event=>{if(inactive){event.preventDefault();return}onClick?.(event);if(!event.defaultPrevented&&nativeActivation)playMinecraftClick()}}>
  {children}
 </Component></ItemInside></ItemScale>
}
function ItemGroup({className,scale:providedScale,style,...props}:React.ComponentProps<"div">&{scale?:1|2|3}){const inherited=React.useContext(ItemScale),scale=providedScale??inherited;return <ItemScale value={scale}><div data-slot="item-group" role="list" className={`mc-item-group ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/></ItemScale>}
function ItemSeparator({className,scale:providedScale,...props}:React.ComponentProps<typeof Separator>){const inherited=React.useContext(ItemScale);return <Separator data-slot="item-separator" className={`mc-item-separator ${className??""}`} scale={providedScale??inherited} {...props}/>}
function ItemMedia({className,variant="default",children,...props}:React.ComponentProps<"div">&{variant?:"default"}){if(variant!=="default")throw new Error("Minecraft item media supports the default thumbnail appearance only");const scale=React.useContext(ItemScale);return <div data-slot="item-media" data-variant={variant} className={`mc-item-media ${className??""}`} {...props}>{children??<MinecraftItemMedia scale={scale}/>}</div>}
function ItemContent({className,children,ref,...props}:React.ComponentProps<"div">){const node=React.useRef<HTMLDivElement>(null),scale=React.useContext(ItemScale),[width,setWidth]=React.useState<number>();React.useImperativeHandle(ref,()=>node.current!,[]);React.useLayoutEffect(()=>{const root=node.current!,measure=()=>setWidth(Math.floor(root.clientWidth/scale));measure();const observer=new ResizeObserver(measure);observer.observe(root);return()=>observer.disconnect()},[scale]);return <ItemClipWidth value={width}><div ref={node} data-slot="item-content" data-mc-item-content-ready={width!=null} className={`mc-item-content ${className??""}`} {...props}>{children}</div></ItemClipWidth>}
type ItemTitleProps=React.ComponentProps<"div">&Pick<MinecraftItemTextProps,"scale"|"maxWidth"|"align"|"clipWidth"|"asChild">
type ItemDescriptionProps=React.ComponentProps<"p">&Pick<MinecraftItemTextProps,"scale"|"maxWidth"|"align"|"clipWidth"|"asChild">
function ItemTitle({className,scale:providedScale,clipWidth:providedClip,...props}:ItemTitleProps){const scale=React.useContext(ItemScale),clipWidth=React.useContext(ItemClipWidth),inside=React.useContext(ItemInside),common={as:"div" as const,"data-slot":"item-title",className:`mc-item-title ${className??""}`,scale:providedScale??scale,...props};return inside||providedClip!=null||props.style?.color!=null||Boolean(className)||typeof props.children!=="string"&&typeof props.children!=="number"?<MinecraftItemText {...common} clipWidth={providedClip??clipWidth}/>:<MinecraftProse {...common}/>}
function ItemDescription({className,scale:providedScale,clipWidth:providedClip,...props}:ItemDescriptionProps){const scale=React.useContext(ItemScale),clipWidth=React.useContext(ItemClipWidth);return <MinecraftItemText as="p" data-slot="item-description" className={`mc-item-description ${className??""}`} scale={providedScale??scale} clipWidth={providedClip??clipWidth} {...props}/>}
function ItemActions({className,...props}:React.ComponentProps<"div">){return <div data-slot="item-actions" className={`mc-item-actions ${className??""}`} {...props}/>}
function ItemHeader({className,children,...props}:React.ComponentProps<"div">){const scale=React.useContext(ItemScale);return <div data-slot="item-header" className={`mc-item-header ${className??""}`} {...props}>{typeof children==="string"||typeof children==="number"?<MinecraftItemText scale={scale}>{children}</MinecraftItemText>:children}</div>}
function ItemFooter({className,children,...props}:React.ComponentProps<"div">){const scale=React.useContext(ItemScale);return <div data-slot="item-footer" className={`mc-item-footer ${className??""}`} {...props}>{typeof children==="string"||typeof children==="number"?<MinecraftItemText scale={scale}>{children}</MinecraftItemText>:children}</div>}
export {Item,ItemGroup,ItemSeparator,ItemMedia,ItemContent,ItemTitle,ItemDescription,ItemActions,ItemHeader,ItemFooter}
export type {ItemProps,ItemTitleProps,ItemDescriptionProps}
