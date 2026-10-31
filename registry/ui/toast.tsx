"use client"

import * as React from "react"
import {Toast as Primitive} from "radix-ui"
import {Button} from "./button"
import {minecraftGlyphs} from "./minecraft-font"
import {getUnihexGlyph} from "./minecraft-unifont"
import {MinecraftToastGraphic,type ToastMotion} from "./minecraft-toast-graphic"
import {MinecraftToastBackdrop} from "./minecraft-toast-backdrop"
import {playMinecraftToastSound} from "./minecraft-toast-sound"
import "./minecraft-toast.css"

const ScaleContext=React.createContext<1|2|3>(2)
const TextContext=React.createContext<{title:(text:string|null)=>void;message:(text:string|null|undefined)=>void}>({title:()=>{},message:()=>{}})
function scalar(children:React.ReactNode):string|null{
 if(typeof children==="string"||typeof children==="number")return String(children)
 if(children==null||typeof children==="boolean")return ""
 if(Array.isArray(children)){const parts=children.map(scalar);return parts.every(p=>p!=null)?parts.join(""):null}
 if(React.isValidElement<{children?:React.ReactNode}>(children)&&children.type===React.Fragment)return scalar(children.props.children)
 return null
}
function ToastProvider({scale=2,...props}:React.ComponentProps<typeof Primitive.Provider>&{scale?:1|2|3}){return <ScaleContext.Provider value={scale}><Primitive.Provider {...props}/></ScaleContext.Provider>}
type ToastProps=React.ComponentProps<typeof Primitive.Root>&{scale?:1|2|3;variant?:"default"}
function Toast({scale:explicit,variant="default",open:controlled,defaultOpen=true,onOpenChange,forceMount,asChild,className,style,children,...props}:ToastProps){
 if(variant!=="default")throw Error("Minecraft SystemToast supports the default visual variant only")
 const inherited=React.useContext(ScaleContext),scale=explicit??inherited,[internal,setInternal]=React.useState(defaultOpen),open=controlled??internal
 const [present,setPresent]=React.useState(open||!!forceMount),[title,setTitle]=React.useState<string|null>(""),[message,setMessage]=React.useState<string|null|undefined>(null),[geometry,setGeometry]=React.useState({width:190,height:32})
 const motion=React.useRef<ToastMotion>({phase:open?"entering":"hidden",start:Date.now()}),previous=React.useRef<boolean|undefined>(undefined)
 React.useLayoutEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  if(open){setPresent(true);motion.current={phase:"entering",start:Date.now()};if(previous.current!==true)playMinecraftToastSound("in")}
  else if(previous.current){motion.current={phase:"exiting",start:Date.now()};playMinecraftToastSound("out");timer=setTimeout(()=>{motion.current.phase="hidden";setPresent(false)},600)}
  previous.current=open
  return()=>{if(timer)clearTimeout(timer)}
 },[open])
 const updateGeometry=React.useCallback((width:number,height:number)=>setGeometry(g=>g.width===width&&g.height===height?g:{width,height}),[])
 const text=React.useMemo(()=>({title:setTitle,message:setMessage}),[])
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}>:null,content=child?child.props.children:children
 const extras=React.Children.toArray(content).some(child=>React.isValidElement(child)&&(child.type===ToastAction||child.type===ToastClose))
 if(!present&&!forceMount)return null
 const rich=title==null||message===undefined
 const artwork=!rich?<span className="mc-toast-art" style={{height:geometry.height*scale}}><MinecraftToastGraphic title={title!} message={message!} scale={scale} motion={motion} onLayout={updateGeometry}/></span>:<span className="mc-toast-art" style={{height:"100%"}}><MinecraftToastBackdrop scale={scale} motion={motion}/></span>
 return <ScaleContext.Provider value={scale}><TextContext.Provider value={text}><Primitive.Root data-slot="toast" data-mc-toast-rich={rich} forceMount asChild={asChild} open={open} inert={!open} onOpenChange={next=>{if(controlled===undefined)setInternal(next);onOpenChange?.(next)}} className={`mc-system-toast ${className??""}`} style={{"--mc-scale":scale,"--mc-toast-height":geometry.height,width:geometry.width*scale,height:rich?undefined:(geometry.height+(extras?26:0))*scale,...style} as React.CSSProperties} {...props}>
  {child?React.cloneElement(child,undefined,content,artwork):<>{content}{artwork}</>}
 </Primitive.Root></TextContext.Provider></ScaleContext.Provider>
}
function ToastTitle({children,className,...props}:React.ComponentProps<typeof Primitive.Title>){
 const context=React.useContext(TextContext),text=scalar(children)
 React.useLayoutEffect(()=>{context.title(text);return()=>context.title("")},[context,text])
 return <Primitive.Title data-slot="toast-title" className={`mc-toast-title ${className??""}`} {...props}>{children}</Primitive.Title>
}
function ToastDescription({children,className,...props}:React.ComponentProps<typeof Primitive.Description>){
 const context=React.useContext(TextContext),text=scalar(children)
 React.useLayoutEffect(()=>{context.message(text==null?undefined:text);return()=>context.message(null)},[context,text])
 return <Primitive.Description data-slot="toast-description" className={`mc-toast-description ${className??""}`} {...props}>{children}</Primitive.Description>
}
const actionWidth=(children:React.ReactNode)=>Math.max(20,Array.from(scalar(children)??"Done").reduce((n,char)=>n+(minecraftGlyphs[char.codePointAt(0)!-32]?.[2]??getUnihexGlyph(char)?.advance??6),0)+12)
function ToastAction({asChild,children,style,...props}:React.ComponentProps<typeof Primitive.Action>){const scale=React.useContext(ScaleContext);return asChild?<Primitive.Action data-slot="toast-action" asChild style={style} {...props}>{children}</Primitive.Action>:<Primitive.Action asChild {...props}><Button data-slot="toast-action" scale={scale} style={{width:actionWidth(children)*scale,...style}}>{children}</Button></Primitive.Action>}
function ToastClose({asChild,children="Done",style,...props}:React.ComponentProps<typeof Primitive.Close>){const scale=React.useContext(ScaleContext);return asChild?<Primitive.Close data-slot="toast-close" asChild style={style} {...props}>{children}</Primitive.Close>:<Primitive.Close asChild {...props}><Button data-slot="toast-close" scale={scale} style={{width:actionWidth(children)*scale,...style}}>{children}</Button></Primitive.Close>}
function ToastViewport({className,...props}:React.ComponentProps<typeof Primitive.Viewport>){return <Primitive.Viewport data-slot="toast-viewport" className={`mc-toast-viewport ${className??""}`} {...props}/>}
type ToastActionElement=React.ReactElement<typeof ToastAction>
export {Toast,ToastProvider,ToastViewport,ToastTitle,ToastDescription,ToastAction,ToastClose}
export type {ToastProps,ToastActionElement}
