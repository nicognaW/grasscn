"use client"
import * as React from "react"
import {Collapsible as Primitive} from "radix-ui"
import {cn} from "@/lib/utils"
import {Button} from "./button"
import {MinecraftCollapsibleText} from "./minecraft-collapsible-text"
import "./minecraft-collapsible.css"
const ScaleContext=React.createContext<1|2|3>(2)
type CollapsibleProps=React.ComponentProps<typeof Primitive.Root>&{scale?:1|2|3}
function Collapsible({scale=2,className,style,...props}:CollapsibleProps){
 return <ScaleContext.Provider value={scale}><Primitive.Root data-slot="collapsible" className={cn("mc-collapsible",className)} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/></ScaleContext.Provider>
}
function CollapsibleTrigger({children,asChild,className,onClick,...props}:React.ComponentProps<typeof Primitive.Trigger>){
 const scale=React.useContext(ScaleContext)
 return <Primitive.Trigger data-slot="collapsible-trigger" asChild className={cn("mc-collapsible-trigger",className)} onClick={event=>{onClick?.(event);if(event.currentTarget.getAttribute("aria-disabled")==="true")event.preventDefault()}} {...props}>{asChild ? children:<Button scale={scale}>{children}</Button>}</Primitive.Trigger>
}
type CollapsibleContentProps=React.ComponentProps<typeof Primitive.Content>&{scale?:1|2|3;maxWidth?:number;align?:"left"|"center";wrap?:boolean}
function CollapsibleContent({children,className,ref,style,scale:explicitScale,maxWidth,align="left",wrap=true,...props}:CollapsibleContentProps){
 const inherited=React.useContext(ScaleContext),scale=explicitScale??inherited,[element,setElement]=React.useState<HTMLDivElement|null>(null),[width,setWidth]=React.useState<number>()
 const forwarded=React.useCallback((node:HTMLDivElement|null)=>{setElement(node);if(typeof ref==="function"){const cleanup=ref(node);if(typeof cleanup==="function")return()=>{setElement(null);cleanup()}}else if(ref)ref.current=node},[ref])
 React.useLayoutEffect(()=>{if(!element)return;const measure=()=>{const computed=getComputedStyle(element),root=element.closest<HTMLElement>('[data-slot="collapsible"]'),physical=element.clientWidth||(computed.width.endsWith("px")?parseFloat(computed.width):0)||root?.clientWidth||0;const logical=Math.floor((physical-parseFloat(computed.paddingLeft)-parseFloat(computed.paddingRight))/scale);if(logical>0){setWidth(logical);element.dataset.mcDisclosureReady="true"}};const resize=new ResizeObserver(measure);resize.observe(element);measure();return()=>resize.disconnect()},[element,scale])
 const scalar=typeof children==="string"||typeof children==="number"
 return <Primitive.Content ref={forwarded} data-slot="collapsible-content" className={cn("mc-collapsible-content",className)} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{scalar ? <MinecraftCollapsibleText scale={scale} maxWidth={maxWidth??(wrap?width:undefined)} align={align} style={{width:"100%"}}>{children}</MinecraftCollapsibleText>:children}</Primitive.Content>
}
export{Collapsible,CollapsibleTrigger,CollapsibleContent}
export type{CollapsibleProps,CollapsibleContentProps}
