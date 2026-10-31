"use client"

import * as React from "react"
import { Button } from "./button"
import { MinecraftText } from "./minecraft-text"
import { playMinecraftClick } from "./minecraft-sound"
import "./minecraft-pagination.css"
import "./minecraft-pagination-assets.css"

function Pagination({className,...props}:React.ComponentProps<"nav">){return <nav role="navigation" aria-label="pagination" data-slot="pagination" className={`mc-pagination ${className??""}`} {...props}/>}
function PaginationContent({className,...props}:React.ComponentProps<"ul">){return <ul data-slot="pagination-content" className={`mc-pagination-content ${className??""}`} {...props}/>}
function PaginationItem(props:React.ComponentProps<"li">){return <li data-slot="pagination-item" {...props}/>}
type PaginationLinkProps=React.ComponentProps<"a"> & {isActive?:boolean; size?:"default"; scale?:1|2|3}
function PaginationLink({isActive,size="default",scale=2,children,className,style,onClick,...props}:PaginationLinkProps){
 if(size!=="default")throw new Error("Minecraft pagination supports the native default visual size only")
 return <Button asChild scale={scale} size={size} className={`mc-pagination-link ${className??""}`} style={{width:40*scale,...style}}><a aria-current={isActive?"page":undefined} data-slot="pagination-link" data-active={isActive||undefined} {...props} onClick={event=>{if(props["aria-disabled"]===true||props["aria-disabled"]==="true"){event.preventDefault();return};onClick?.(event)}}>{children}</a></Button>
}
function PaginationArrow({direction,scale=2,size="default",className,style,onClick,children,isActive,...props}:PaginationLinkProps & {direction:"backward"|"forward"}){
 if(size!=="default")throw new Error("Minecraft pagination supports the native default visual size only")
 return <a data-slot={direction==="forward"?"pagination-next":"pagination-previous"} data-direction={direction} className={`mc-pagination-arrow ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} aria-current={isActive?"page":undefined} {...props}
  onClick={event=>{if(props["aria-disabled"]===true||props["aria-disabled"]==="true"){event.preventDefault();return};onClick?.(event);if(!event.defaultPrevented)playMinecraftClick()}}>{children}</a>
}
function PaginationPrevious(props:PaginationLinkProps){return <PaginationArrow direction="backward" aria-label="Go to previous page" {...props}/>}
function PaginationNext(props:PaginationLinkProps){return <PaginationArrow direction="forward" aria-label="Go to next page" {...props}/>}
function PaginationEllipsis({className,scale=2,style,...props}:React.ComponentProps<"span"> & {scale?:1|2|3}){return <span aria-hidden="true" data-slot="pagination-ellipsis" className={`mc-pagination-ellipsis ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}><MinecraftText>...</MinecraftText></span>}

export { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis }
export type { PaginationLinkProps }
