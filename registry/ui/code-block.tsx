"use client"

import "./minecraft-code-block.css"
import * as React from "react"
import {Button} from "./button"
import {MinecraftSelectableText} from "./minecraft-selectable-text"
import {minecraftLoadingGlyphs} from "./minecraft-loading-glyphs"
import {ChatChildren,MessageScale} from "./message"

const CodeScale=React.createContext<1|2|3>(2)
type CodeBlockProps=React.ComponentProps<"div">&{variant?:"default"|"destructive";size?:"default";scale?:1|2|3}
function CodeBlock({variant="default",size="default",scale=2,className,style,...props}:CodeBlockProps){if(size!=="default"||!["default","destructive"].includes(variant))throw new Error("Unsupported Minecraft code surface variant");return <CodeScale value={scale}><MessageScale value={scale}><div data-slot="code-block" data-variant={variant} data-size={size} className={`mc-code-block ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/></MessageScale></CodeScale>}
function CodeBlockHeader({className,...props}:React.ComponentProps<"div">){return <div data-slot="code-block-header" className={`mc-code-block-header ${className??""}`} {...props}/>}
function CodeBlockTitle({className,children,...props}:React.ComponentProps<"div">){return <div data-slot="code-block-title" className={`mc-code-block-title ${className??""}`} {...props}><ChatChildren>{children}</ChatChildren></div>}
function CodeBlockActions({className,...props}:React.ComponentProps<"div">){return <div data-slot="code-block-actions" className={`mc-code-block-actions ${className??""}`} {...props}/>}
function CodeBlockCopyButton({value,variant="default",size="default",onClick,children,...props}:React.ComponentProps<typeof Button>&{value:string}){
 const [copied,setCopied]=React.useState(false),scale=React.useContext(CodeScale),live=React.useRef(true)
 React.useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
 React.useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),2000);return()=>clearTimeout(timer)},[copied])
 return <><Button data-slot="code-block-copy-button" data-copied={copied||undefined} aria-label={copied?"Copied":"Copy"} variant={variant} size={size} scale={scale} onClick={event=>{onClick?.(event);if(event.defaultPrevented)return;Promise.resolve(navigator.clipboard?.writeText(value)).then(()=>{if(live.current&&navigator.clipboard)setCopied(true)}).catch(()=>{})}} {...props}>{children??(copied?"Copied":"Copy")}</Button><span aria-live="polite" className="mc-code-block-announcement">{copied?"Copied":""}</span></>
}
function selectable(value:React.ReactNode):React.ReactNode{
 if(typeof value==="string"||typeof value==="number")return <MinecraftSelectableText text={String(value)}/>
 if(Array.isArray(value))return value.map((child,index)=><React.Fragment key={index}>{selectable(child)}</React.Fragment>)
 if(React.isValidElement<{children?:React.ReactNode}>(value)&&(value.type===React.Fragment||typeof value.type==="string"&&["span","a","strong","em","code","b","i"].includes(value.type)))return React.cloneElement(value,undefined,selectable(value.props.children))
 return value
}
function CodeBlockContent({className,children,style,wrap=false,lineNumbers=false,startLine=1,...props}:React.ComponentProps<"pre">&{wrap?:boolean;lineNumbers?:boolean;startLine?:number}){
 return <pre data-slot="code-block-content" data-wrap={wrap||undefined} data-numbered={lineNumbers||undefined} dir="ltr" tabIndex={0} style={{counterReset:`line ${startLine-1}`,...style}} className={`mc-code-block-content ${className??""}`} {...props}><code data-slot="code-block-code">{lineNumbers&&typeof children==="string"?children.replace(/\n$/,"").split("\n").map((line,index)=><CodeBlockLine key={index}>{line}</CodeBlockLine>):selectable(children)}</code></pre>
}
function CodeLineMarker({variant}:{variant:"added"|"removed"}){const glyph=minecraftLoadingGlyphs[variant==="added"?"+":"-"];return <svg aria-hidden="true" className="mc-code-block-line-marker" viewBox="0 0 8 9"><g fill="currentColor">{glyph.pixels.map(([x,y],index)=><rect key={index} x={x} y={y} width="1" height="1"/>)}</g></svg>}
function CodeBlockLine({className,variant="default",children,...props}:React.ComponentProps<"span">&{variant?:"default"|"added"|"removed"|"highlighted"}){
 const empty=children==null||children===""||Array.isArray(children)&&children.length===0
 return <span data-slot="code-block-line" data-variant={variant} className={`mc-code-block-line ${className??""}`} {...props}><span data-slot="code-block-line-content">{empty?"\n":selectable(children)}</span>{variant==="added"||variant==="removed"?<CodeLineMarker variant={variant}/>:null}</span>
}
function CodeBlockFooter({className,children,...props}:React.ComponentProps<"div">){return <div data-slot="code-block-footer" className={`mc-code-block-footer ${className??""}`} {...props}><ChatChildren>{children}</ChatChildren></div>}
export {CodeBlock,CodeBlockHeader,CodeBlockTitle,CodeBlockActions,CodeBlockCopyButton,CodeBlockContent,CodeBlockLine,CodeBlockFooter}
export type {CodeBlockProps}
