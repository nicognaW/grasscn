"use client"

import "./minecraft-message-scroller.css"
import * as React from "react"
import {MessageScroller as Primitive,useMessageScroller,useMessageScrollerScrollable,useMessageScrollerVisibility} from "@shadcn/react/message-scroller"
import {Button} from "./button"
import {MessageContent,MessageScale} from "./message"
import {minecraftTextareaAssets} from "./minecraft-textarea-assets"

const ScrollerScale=React.createContext<1|2|3>(2)
function MessageScrollerProvider(props:React.ComponentProps<typeof Primitive.Provider>){return <Primitive.Provider {...props}/>}
function MessageScroller({className,scale=2,style,...props}:React.ComponentProps<typeof Primitive.Root>&{scale?:1|2|3}){return <ScrollerScale value={scale}><MessageScale value={scale}><Primitive.Root data-slot="message-scroller" className={`mc-message-scroller ${className??""}`} style={{"--mc-scale":scale,"--mc-track":`url("${minecraftTextareaAssets.scroller_background}")`,"--mc-thumb":`url("${minecraftTextareaAssets.scroller}")`,...style} as React.CSSProperties} {...props}/></MessageScale></ScrollerScale>}
function MessageScrollerViewport({className,...props}:React.ComponentProps<typeof Primitive.Viewport>){return <Primitive.Viewport data-slot="message-scroller-viewport" className={`mc-message-scroller-viewport ${className??""}`} {...props}/>}
function MessageScrollerContent({className,...props}:React.ComponentProps<typeof Primitive.Content>){return <Primitive.Content data-slot="message-scroller-content" className={`mc-message-scroller-content ${className??""}`} {...props}/>}
function MessageScrollerItem({className,scrollAnchor=false,children,...props}:React.ComponentProps<typeof Primitive.Item>){return <Primitive.Item data-slot="message-scroller-item" scrollAnchor={scrollAnchor} className={`mc-message-scroller-item ${className??""}`} {...props}>{typeof children==="string"||typeof children==="number"?<MessageContent>{children}</MessageContent>:children}</Primitive.Item>}
function MessageScrollerButton({direction="end",className,children,render,variant="default",size="default",...props}:React.ComponentProps<typeof Primitive.Button>&Pick<React.ComponentProps<typeof Button>,"variant"|"size">){const scale=React.useContext(ScrollerScale);return <Primitive.Button data-slot="message-scroller-button" data-direction={direction} data-variant={variant} data-size={size} direction={direction} className={`mc-message-scroller-button ${className??""}`} render={render??<Button variant={variant} size={size} scale={scale}/>} {...props}>{children??(direction==="end"?"Scroll to end":"Scroll to start")}</Primitive.Button>}
export {MessageScrollerProvider,MessageScroller,MessageScrollerViewport,MessageScrollerContent,MessageScrollerItem,MessageScrollerButton,useMessageScroller,useMessageScrollerScrollable,useMessageScrollerVisibility}
