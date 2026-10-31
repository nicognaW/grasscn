"use client"

import "./minecraft-bubble.css"
import * as React from "react"
import {Slot} from "radix-ui"
import {MessageScale,MessageAuthor,isChatInline} from "./message"
import {minecraftGlyphs} from "./minecraft-font"
import {getUnihexGlyph,loadUnihex} from "./minecraft-unifont"
import {MinecraftChatText} from "./minecraft-chat-text"
import {disclosureAdvance} from "./minecraft-disclosure-metrics"

function BubbleGroup({className,scale:providedScale,style,...props}:React.ComponentProps<"div">&{scale?:1|2|3}){const inherited=React.useContext(MessageScale),scale=providedScale??inherited;return <MessageScale value={scale}><div data-slot="bubble-group" className={`mc-bubble-group ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/></MessageScale>}
type BubbleProps=React.ComponentProps<"div">&{variant?:"default";align?:"start"|"end";scale?:1|2|3;from?:"user"|"assistant"|"system";author?:string}
function Bubble({variant="default",align="start",scale:providedScale,from,author:providedAuthor,className,style,...props}:BubbleProps){const inherited=React.useContext(MessageScale),scale=providedScale??inherited,author=providedAuthor??(from==="user"?"Player":from==="assistant"?"Assistant":undefined);if(variant!=="default")throw new Error("Minecraft chat supports the default backdrop only");return <MessageScale value={scale}><MessageAuthor value={author}><div data-slot="bubble" data-variant={variant} data-align={align} data-from={from} data-author={author} className={`mc-bubble ${className??""}`} style={{"--mc-scale":scale,...(from==="system"?{color:"#ffff55"}:{}),...style} as React.CSSProperties} {...props}/></MessageAuthor></MessageScale>}
function BubbleContent({asChild=false,className,children,ref,...props}:React.ComponentProps<"div">&{asChild?:boolean}){
 const scale=React.useContext(MessageScale),author=React.useContext(MessageAuthor),node=React.useRef<HTMLElement>(null),[available,setAvailable]=React.useState<number>(),[fontReady,setFontReady]=React.useState(false);React.useImperativeHandle(ref,()=>node.current! as HTMLDivElement,[])
 React.useLayoutEffect(()=>{const element=node.current!,bubble=element.closest<HTMLElement>("[data-slot=bubble]"),parent=bubble?.parentElement??element.parentElement!;const update=()=>{const ownStyle=getComputedStyle(element),parentStyle=getComputedStyle(parent),fixed=element.style.width&&element.style.width!=="auto";let pixels=fixed?element.clientWidth:parent.clientWidth-parseFloat(parentStyle.paddingLeft)-parseFloat(parentStyle.paddingRight);if(bubble){const maximum=getComputedStyle(bubble).maxWidth;if(maximum.endsWith("px"))pixels=Math.min(pixels,parseFloat(maximum));if(bubble.style.width&&bubble.style.width!=="auto")pixels=Math.min(pixels,bubble.clientWidth)}setAvailable(Math.max(1,Math.floor((pixels-parseFloat(ownStyle.paddingLeft)-parseFloat(ownStyle.paddingRight))/scale)))};update();const observer=new ResizeObserver(update);observer.observe(parent);observer.observe(element);return()=>observer.disconnect()},[scale])
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null,original=child?child.props.children:children,content=author&&(typeof original==="string"||typeof original==="number")?`<${author}> ${original}`:original
 const plainText=(value:React.ReactNode):string=>typeof value==="string"||typeof value==="number"?String(value):Array.isArray(value)?value.map(plainText).join(""):React.isValidElement<{children?:React.ReactNode}>(value)?plainText(value.props.children):""
 const text=plainText(content),unicode=/[^\x00-\x7f]/.test(text)
 React.useLayoutEffect(()=>{let live=true;setFontReady(!unicode);if(unicode)loadUnihex().then(()=>{if(live)setFontReady(true)});return()=>{live=false}},[text,unicode])
 const naturalWidth=Math.max(0,...text.split("\n").map(line=>Math.ceil(Array.from(line).reduce((sum,char)=>sum+(minecraftGlyphs[char.codePointAt(0)!-32]?.[2]??getUnihexGlyph(char)?.advance??disclosureAdvance(char)??6),0)))),width=Math.min(naturalWidth,available??naturalWidth)
 const rendered=isChatInline(content)?<MinecraftChatText scale={scale} maxWidth={width} style={{color:"inherit"}}>{content}</MinecraftChatText>:content
 const Comp=asChild?Slot.Root:"div"
 return <Comp ref={node as React.Ref<HTMLDivElement>} data-slot="bubble-content" data-mc-chat-ready={available!=null&&(!unicode||fontReady)?"true":"false"} className={`mc-bubble-content ${className??""}`} {...props}>{child?React.cloneElement(child,undefined,rendered):rendered}</Comp>
}
function BubbleReactions({side="bottom",align="end",className,...props}:React.ComponentProps<"div">&{side?:"top"|"bottom";align?:"start"|"end"}){return <div data-slot="bubble-reactions" data-side={side} data-align={align} className={`mc-bubble-reactions ${className??""}`} {...props}/>}
export {BubbleGroup,Bubble,BubbleContent,BubbleReactions}
export type {BubbleProps}
