"use client"

import * as React from "react"
import {createPortal} from "react-dom"
import {Toaster as Sonner,toast,type ToasterProps as SonnerProps} from "sonner"
import {MinecraftToastGraphic,type ToastMotion} from "./minecraft-toast-graphic"
import {MinecraftToastBackdrop} from "./minecraft-toast-backdrop"
import {playMinecraftToastSound} from "./minecraft-toast-sound"
import {playMinecraftClick} from "./minecraft-sound"
import {Button,buttonVariants} from "./button"
import {minecraftGlyphs} from "./minecraft-font"
import {getUnihexGlyph,loadUnihex} from "./minecraft-unifont"
import "./minecraft-sonner.css"

type ActionModel={node:HTMLButtonElement;label:string;index:number;count:number}
type Model={key:number;node:HTMLElement;title:string;message:string|null;rich:boolean;motion:React.RefObject<ToastMotion>;removedAt?:number;bounds:DOMRect;ghost:boolean;timer?:ReturnType<typeof setTimeout>;width:number;height:number;buttons:ActionModel[];geometryChanged?:()=>void}
type ToasterProps=Omit<SonnerProps,"richColors"|"expand">&{richColors?:false;expand?:true;scale?:1|2|3;ref?:React.Ref<HTMLElement>}
function ActionGraphic({action,model,scale}:{action:ActionModel;model:Model;scale:1|2|3}){
 const [fontReady,setFontReady]=React.useState(false)
 React.useLayoutEffect(()=>{let live=true;loadUnihex().then(()=>{if(live)setFontReady(true)});return()=>{live=false}},[])
 React.useLayoutEffect(()=>{
  const available=Math.max(20,(model.width-30-6*(action.count-1))/action.count),natural=Math.max(20,Array.from(action.label).reduce((n,char)=>n+(minecraftGlyphs[char.codePointAt(0)!-32]?.[2]??getUnihexGlyph(char)?.advance??6),0)+12),width=Math.min(available,natural)
  Object.assign(action.node.style,{position:"absolute",left:`${(18+action.index*(available+6))*scale}px`,right:"auto",top:`${(model.height+6)*scale}px`,width:`${width*scale}px`,height:`${20*scale}px`,padding:"0",fontSize:"0"})
 },[action,model,scale,fontReady])
 const inherited=Object.fromEntries(Array.from({length:9},(_,i)=>[`--mc-piece-${i}`,"inherit"]))
 return <Button asChild scale={scale} disabled={action.node.disabled} className="mc-sonner-button-art" style={{...inherited,"--mc-ink":"inherit","--mc-shadow":"inherit",position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"} as React.CSSProperties}><span aria-hidden="true">{action.label}</span></Button>
}
function ModelGraphic({model,scale}:{model:Model;scale:1|2|3}){
 const [height,setHeight]=React.useState(model.height)
 const update=React.useCallback((width:number,height:number)=>{
  model.width=width;model.height=height;setHeight(height)
  if(model.node.isConnected){
   const actions=model.node.querySelector('[data-button],[data-close-button]'),total=height+(actions?26:0)
   model.node.style.width=`${width*scale}px`;model.node.style.height=`${total*scale}px`;model.node.style.setProperty("--mc-toast-height",String(height));model.bounds=model.node.getBoundingClientRect()
   model.geometryChanged?.()
  }
 },[model,scale])
 return <span className="mc-sonner-art" style={{position:model.rich?"absolute":"relative",display:"block",left:0,top:0,width:"100%",height:model.rich?"100%":height*scale,pointerEvents:"none",zIndex:-1}}>{model.rich?<MinecraftToastBackdrop scale={scale} motion={model.motion}/>:<MinecraftToastGraphic title={model.title} message={model.message} scale={scale} motion={model.motion} onLayout={update}/>}</span>
}
function Toaster({scale=2,richColors=false,expand=true,position="top-right",offset=0,gap=0,visibleToasts=5,className,style,toastOptions,ref,...props}:ToasterProps){
 if(richColors||!expand)throw Error("Minecraft notifications support the native palette and expanded stack only")
 const [host,setHost]=React.useState<HTMLElement|null>(null),[models,setModels]=React.useState<Model[]>([]),sequence=React.useRef(0),entriesRef=React.useRef(new Map<HTMLElement,Model>())
 React.useImperativeHandle(ref,()=>host!,[host])
 React.useLayoutEffect(()=>()=>{for(const model of entriesRef.current.values())if(model.timer)clearTimeout(model.timer);entriesRef.current.clear()},[])
 React.useLayoutEffect(()=>{
  if(!host)return
  const entries=entriesRef.current
  const relayout=()=>{
   for(const list of host.querySelectorAll<HTMLElement>('[data-sonner-toaster]')){
    let offset=0
    const nodes=Array.from(list.querySelectorAll<HTMLElement>('[data-sonner-toast]')).sort((a,b)=>Number(a.dataset.index)-Number(b.dataset.index))
    for(const node of nodes){const model=entries.get(node);if(!model)continue;node.style.setProperty("--mc-native-offset",`${offset}px`);const actions=node.querySelector('[data-button],[data-close-button]');offset+=(model.rich?node.offsetHeight:(model.height+(actions?26:0))*scale)+gap;model.bounds=node.getBoundingClientRect()}
   }
  }
  const remove=(model:Model)=>{entries.delete(model.node);setModels(Array.from(entries.values()))}
  const beginExit=(model:Model)=>{
   if(model.removedAt!=null)return
   model.removedAt=Date.now();model.motion.current={phase:"exiting",start:model.removedAt};model.node.inert=true
   const rect=model.node.getBoundingClientRect();if(rect.width)model.bounds=rect
   playMinecraftToastSound("out");model.timer=setTimeout(()=>remove(model),600)
  }
  const scan=()=>{
   for(const node of host.querySelectorAll<HTMLElement>('[data-sonner-toast]')){
    const title=node.querySelector<HTMLElement>('[data-title]'),description=node.querySelector<HTMLElement>('[data-description]')
    const rich=!!(title?.childElementCount||description?.childElementCount)
    let model=entries.get(node)
    if(!model){model={key:sequence.current++,node,title:title?.textContent??"",message:description?.textContent??null,rich,motion:{current:{phase:"entering",start:Date.now()}},bounds:node.getBoundingClientRect(),ghost:false,width:190,height:32,buttons:[]};entries.set(node,model);playMinecraftToastSound("in")}
    model.title=title?.textContent??"";model.message=description?.textContent??null;model.rich=rich
    model.geometryChanged=relayout
    node.dataset.mcScale=String(scale);node.style.setProperty("--mc-scale",String(scale));node.dataset.mcToastRich=String(rich)
    const buttons=Array.from(node.querySelectorAll<HTMLButtonElement>('button[data-button],button[data-close-button]'))
    model.buttons=buttons.map((button,index)=>{button.classList.add(...buttonVariants().split(" "));const text=Array.from(button.childNodes).filter(n=>!(n instanceof HTMLElement&&n.classList.contains("mc-sonner-button-art"))).map(n=>n.textContent??"").join("");return {node:button,label:text||"Done",index,count:buttons.length}})
    if(node.dataset.removed==="true")beginExit(model)
   }
   for(const model of entries.values())if(!model.node.isConnected){beginExit(model);model.ghost=true}
   relayout()
   setModels(Array.from(entries.values()))
  }
  const observer=new MutationObserver(records=>{
   const relevant=records.some(record=>{
    const target=record.target.nodeType===Node.ELEMENT_NODE?record.target as HTMLElement:record.target.parentElement
    if(target?.closest(".mc-sonner-art,.mc-sonner-button-art"))return false
    if(record.type==="attributes")return record.attributeName==="data-removed"
    if(record.type==="characterData")return true
    return [...record.addedNodes,...record.removedNodes].some(node=>!(node instanceof HTMLElement&&(node.classList.contains("mc-sonner-art")||node.classList.contains("mc-sonner-button-art"))))
   })
   if(relevant)scan()
  })
  observer.observe(host,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["data-removed"]});scan()
  const click=(event:MouseEvent)=>{const button=(event.target as Element)?.closest<HTMLButtonElement>('button[data-button],button[data-close-button]');if(button&&!button.disabled)queueMicrotask(()=>{if(!event.defaultPrevented)playMinecraftClick()})}
  host.addEventListener("click",click)
  return()=>{observer.disconnect();host.removeEventListener("click",click)}
 },[host,scale,gap])
 return <><Sonner ref={setHost} className={`mc-sonner ${className??""}`} position={position} offset={offset} gap={gap} visibleToasts={visibleToasts} expand={expand} richColors={false} style={{"--mc-scale":scale,...style} as React.CSSProperties} toastOptions={{...toastOptions,unstyled:true}} {...props}/>{models.map(model=>model.ghost?<div key={model.key} aria-hidden="true" className="mc-sonner-ghost" style={{position:"fixed",left:model.bounds.x,top:model.bounds.y,width:model.bounds.width,height:model.bounds.height,zIndex:999999999,pointerEvents:"none",isolation:"isolate"}}><ModelGraphic model={model} scale={scale}/></div>:<React.Fragment key={model.key}>{createPortal(<ModelGraphic model={model} scale={scale}/>,model.node,String(model.key))}{model.buttons.filter(a=>a.node.isConnected).map(action=>createPortal(<ActionGraphic action={action} model={model} scale={scale}/>,action.node,`${model.key}-action-${action.index}`))}</React.Fragment>)}</>
}
export {Toaster,toast}
export type {ToasterProps}
