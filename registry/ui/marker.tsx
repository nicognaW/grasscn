"use client"
import *as React from'react'
import{Slot}from'radix-ui'
import{cva,type VariantProps}from'class-variance-authority'
import{Label,type LabelProps}from'./label'
import{minecraftSeparatorAssets}from'./minecraft-separator-assets'
import'./minecraft-marker.css'
const MarkerScale=React.createContext<1|2|3>(2)
const markerVariants=cva('mc-marker',{variants:{variant:{default:'',separator:'mc-marker-separated',border:'mc-marker-border'}},defaultVariants:{variant:'default'}})
type MarkerProps=React.ComponentProps<'div'>&VariantProps<typeof markerVariants>&{asChild?:boolean;scale?:1|2|3;separatorEdge?:'header'|'footer'}
function Marker({variant='default',asChild=false,scale=2,separatorEdge='header',className,children,style,...props}:MarkerProps){
 if(!['default','separator','border'].includes(variant??'default'))throw Error('Unsupported Minecraft marker layout')
 const Root=asChild?Slot.Root:'div',child=asChild?React.Children.only(children)as React.ReactElement<{children?:React.ReactNode}>:null,content=child?child.props.children:children
 const contents=typeof content==='string'||typeof content==='number'?<MarkerContent>{content}</MarkerContent>:content
 return <MarkerScale value={scale}><Root data-slot="marker" data-variant={variant} className={markerVariants({variant,className})} style={{'--mc-scale':scale,'--mc-marker-separator':`url("${minecraftSeparatorAssets[separatorEdge]}")`,...style}as React.CSSProperties} {...props}>{child?React.cloneElement(child,undefined,contents):contents}</Root></MarkerScale>
}
function MarkerIcon({className,...props}:React.ComponentProps<'span'>){return <span data-slot="marker-icon" aria-hidden="true" className={`mc-marker-icon ${className??''}`} {...props}/>}
function MarkerContent({className,children,maxWidth,align='left',...props}:React.ComponentProps<'span'>&Pick<LabelProps,'maxWidth'|'align'>){const scale=React.useContext(MarkerScale);return <span data-slot="marker-content" className={`mc-marker-content ${className??''}`} {...props}>{typeof children==='string'||typeof children==='number'?<Label scale={scale} maxWidth={maxWidth} align={align} style={{width:"100%"}}>{children}</Label>:children}</span>}
export{Marker,MarkerIcon,MarkerContent,markerVariants}
export type{MarkerProps}

