"use client"

import "./minecraft-trace.css"
import * as React from "react"
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from "./collapsible"
import {ChatChildren,MessageScale} from "./message"

function Trace({className,scale=2,style,...props}:React.ComponentProps<"div">&{scale?:1|2|3}){return <MessageScale value={scale}><div data-slot="trace" className={`mc-trace ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/></MessageScale>}
function TraceLine({className,status,...props}:React.ComponentProps<"span">&{status?:"running"|"error"|"pending"}){return <span data-slot="trace-line" data-status={status} className={`mc-trace-line ${className??""}`} {...props}/>}
function TraceIcon({className,children,...props}:React.ComponentProps<"span">){return <span data-slot="trace-icon" aria-hidden="true" className={`mc-trace-icon ${className??""}`} {...props}><ChatChildren>{children}</ChatChildren></span>}
function TraceTitle({className,children,...props}:React.ComponentProps<"span">){return <span data-slot="trace-title" className={`mc-trace-title ${className??""}`} {...props}><ChatChildren>{children}</ChatChildren></span>}
function TraceDescription({className,children,...props}:React.ComponentProps<"span">){return <span data-slot="trace-description" className={`mc-trace-description ${className??""}`} {...props}><ChatChildren>{children}</ChatChildren></span>}
type TraceCollapsibleProps=Omit<React.ComponentProps<typeof Collapsible>,"asChild"|"open">&({open?:undefined}|{open:boolean;onOpenChange:NonNullable<React.ComponentProps<typeof Collapsible>["onOpenChange"]>})
function TraceCollapsible({className,scale:ownScale,...props}:TraceCollapsibleProps){const inherited=React.useContext(MessageScale),scale=ownScale??inherited;return <MessageScale value={scale}><Collapsible scale={scale} data-slot="trace-collapsible" className={`mc-trace-collapsible ${className??""}`} {...props}/></MessageScale>}
function TraceCollapsibleTrigger({className,children,...props}:Omit<React.ComponentProps<typeof CollapsibleTrigger>,"asChild">){return <CollapsibleTrigger data-slot="trace-collapsible-trigger" className={`mc-trace-collapsible-trigger ${className??""}`} {...props}>{children}<TraceIcon className="mc-trace-chevron"><span className="mc-trace-closed"><ChatChildren>{">"}</ChatChildren></span><span className="mc-trace-open"><ChatChildren>v</ChatChildren></span></TraceIcon></CollapsibleTrigger>}
function TraceCollapsibleContent({className,children,...props}:Omit<React.ComponentProps<typeof CollapsibleContent>,"asChild">){return <CollapsibleContent data-slot="trace-collapsible-content" className="mc-trace-collapsible-content" {...props}><div data-slot="trace-collapsible-content-inner" className={`mc-trace-collapsible-content-inner ${className??""}`}><ChatChildren>{children}</ChatChildren></div></CollapsibleContent>}
export {Trace,TraceLine,TraceIcon,TraceTitle,TraceDescription,TraceCollapsible,TraceCollapsibleTrigger,TraceCollapsibleContent}
export type {TraceCollapsibleProps}
