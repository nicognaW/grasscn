"use client"

import "./minecraft-message.css"
import * as React from "react"
import { MinecraftChatText } from "./minecraft-chat-text"

const MessageScale=React.createContext<1|2|3>(2)
const MessageAuthor=React.createContext<string|undefined>(undefined)
type MessageProps=React.ComponentProps<"div">&{align?:"start"|"end";scale?:1|2|3;author?:string;kind?:"chat"|"system"}
function MessageGroup({className,...props}:React.ComponentProps<"div">){return <div data-slot="message-group" className={`mc-message-group ${className??""}`} {...props}/>}
function Message({className,align="start",scale:ownScale,author,kind="chat",style,...props}:MessageProps){const inherited=React.useContext(MessageScale),scale=ownScale??inherited;return <MessageScale value={scale}><MessageAuthor value={author}><div data-slot="message" data-align={align} data-author={author} data-kind={kind} className={`mc-message ${className??""}`} style={{"--mc-scale":scale,...(kind==="system"?{color:"#ffff55"}:{}),...style} as React.CSSProperties} {...props}/></MessageAuthor></MessageScale>}
function MessageAvatar({className,...props}:React.ComponentProps<"div">){return <div data-slot="message-avatar" className={`mc-message-avatar ${className??""}`} {...props}/>}
function isChatInline(value:React.ReactNode):boolean{if(value==null||typeof value==="boolean"||typeof value==="string"||typeof value==="number")return true;if(Array.isArray(value))return value.every(isChatInline);return React.isValidElement<{children?:React.ReactNode}>(value)&&(value.type===React.Fragment||typeof value.type==="string"&&["span","a","strong","em","b","i","u","s","small","code","mark","abbr","sub","sup"].includes(value.type))&&isChatInline(value.props.children)}
function ChatChildren({children}:React.PropsWithChildren){const scale=React.useContext(MessageScale);return isChatInline(children)?<MinecraftChatText scale={scale} style={{color:"inherit"}}>{children}</MinecraftChatText>:children}
function MessageContent({className,children,ref,...props}:React.ComponentProps<"div">){
 const scale=React.useContext(MessageScale),author=React.useContext(MessageAuthor),node=React.useRef<HTMLDivElement>(null),[width,setWidth]=React.useState<number>(),scalar=typeof children==="string"||typeof children==="number"
 React.useImperativeHandle(ref,()=>node.current!,[])
 React.useLayoutEffect(()=>{const element=node.current!;const update=()=>setWidth(Math.floor(element.clientWidth/scale)-12);update();const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect()},[scale])
 return <div ref={node} data-slot="message-content" data-mc-chat-surface={scalar?"true":undefined} data-mc-chat-ready={width!=null?"true":"false"} className={`mc-message-content ${className??""}`} {...props}>{scalar?<MinecraftChatText scale={scale} maxWidth={width&&width>0?width:undefined} style={{color:"inherit"}}>{author?`<${author}> ${children}`:children}</MinecraftChatText>:children}</div>
}
function MessageHeader({className,children,...props}:React.ComponentProps<"div">){return <div data-slot="message-header" className={`mc-message-header ${className??""}`} {...props}><ChatChildren>{children}</ChatChildren></div>}
function MessageFooter({className,children,...props}:React.ComponentProps<"div">){return <div data-slot="message-footer" className={`mc-message-footer ${className??""}`} {...props}><ChatChildren>{children}</ChatChildren></div>}
export {MessageGroup,Message,MessageAvatar,MessageContent,MessageHeader,MessageFooter,MessageScale,MessageAuthor,ChatChildren,isChatInline}
export type {MessageProps}
