"use client"

import * as React from "react"
import { MinecraftProse } from "./minecraft-prose"
import "./minecraft-breadcrumb.css"

const BreadcrumbScale=React.createContext<1|2|3>(2)
function Breadcrumb({scale=2,style,...props}:React.ComponentProps<"nav">&{scale?:1|2|3}){return <BreadcrumbScale value={scale}><nav aria-label="Breadcrumb" data-slot="breadcrumb" style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/></BreadcrumbScale>}
function BreadcrumbList({className,...props}:React.ComponentProps<"ol">){return <ol data-slot="breadcrumb-list" className={`mc-breadcrumb-list ${className??""}`} {...props}/>}
function BreadcrumbItem({className,...props}:React.ComponentProps<"li">){return <li data-slot="breadcrumb-item" className={`mc-breadcrumb-item ${className??""}`} {...props}/>}
type BreadcrumbLinkProps=React.ComponentProps<"a">&{asChild?:boolean;scale?:1|2|3;maxWidth?:number;align?:"left"|"center"}
function BreadcrumbLink({asChild,className,children,scale,maxWidth,align,...props}:BreadcrumbLinkProps){const inherited=React.useContext(BreadcrumbScale);return <MinecraftProse asChild data-slot="breadcrumb-link" className={`mc-breadcrumb-link ${className??""}`} scale={scale??inherited} maxWidth={maxWidth} align={align} {...props}>{asChild?children:<a>{children}</a>}</MinecraftProse>}
function BreadcrumbPage({children,className,scale,maxWidth,align,...props}:React.ComponentProps<"span">&{scale?:1|2|3;maxWidth?:number;align?:"left"|"center"}){const inherited=React.useContext(BreadcrumbScale);return <MinecraftProse as="span" data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className={`mc-breadcrumb-page ${className??""}`} scale={scale??inherited} maxWidth={maxWidth} align={align} {...props}>{children}</MinecraftProse>}
function BreadcrumbSeparator({children,className,...props}:React.ComponentProps<"li">){const scale=React.useContext(BreadcrumbScale);return <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={`mc-breadcrumb-separator ${className??""}`} {...props}>{children??<MinecraftProse scale={scale}>{">"}</MinecraftProse>}</li>}
function BreadcrumbEllipsis({className,...props}:React.ComponentProps<"span">){const scale=React.useContext(BreadcrumbScale);return <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={className} {...props}><MinecraftProse scale={scale}>...</MinecraftProse><span className="mc-breadcrumb-accessible">More</span></span>}
export {Breadcrumb,BreadcrumbList,BreadcrumbItem,BreadcrumbLink,BreadcrumbPage,BreadcrumbSeparator,BreadcrumbEllipsis}
export type {BreadcrumbLinkProps}
