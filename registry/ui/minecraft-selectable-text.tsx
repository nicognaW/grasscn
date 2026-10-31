"use client"

import * as React from "react"
import {MinecraftColorUnicodeLabel} from "./minecraft-color-unicode"
import {minecraftChatAtlas} from "./minecraft-chat-atlas"
import {loadUnihex} from "./minecraft-unifont"
import "./minecraft-selectable-text.css"

type Run={text:string;x:number;y:number}
function MinecraftSelectableText({text,className,...props}:React.ComponentProps<"span">&{text:string}){
 const root=React.useRef<HTMLSpanElement>(null),raw=React.useRef<HTMLSpanElement>(null),[runs,setRuns]=React.useState<Run[]>([]),[ready,setReady]=React.useState(false)
 React.useLayoutEffect(()=>{let alive=true,fontReady=false,frame=0;setReady(false);const measure=()=>{if(!fontReady)return;const element=root.current!,value=raw.current!,node=value.firstChild;if(!node||node.nodeType!==Node.TEXT_NODE)return;const bounds=element.getBoundingClientRect(),scale=Number(getComputedStyle(element).getPropertyValue("--mc-scale"))||2,range=document.createRange(),next:Run[]=[];let offset=0,previousRight=NaN;for(const char of text){range.setStart(node,offset);offset+=char.length;range.setEnd(node,offset);if(char==="\n"||char==="\t"){previousRight=NaN;continue;}const box=range.getBoundingClientRect(),x=box.x-bounds.x,y=Math.floor((box.y-bounds.y)/(9*scale))*(9*scale),last=next.at(-1);if(last&&Math.abs(last.y-y)<.1&&Math.abs(x-previousRight)<.1){last.text+=char}else next.push({text:char,x,y});previousRight=box.right-bounds.x}setRuns(next);setReady(true)};Promise.all([document.fonts.ready,loadUnihex()]).then(()=>{if(alive){fontReady=true;measure();frame=requestAnimationFrame(measure)}});const observer=new ResizeObserver(()=>{if(alive)measure()});observer.observe(root.current!);return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect()}},[text])
 return <span ref={root} data-mc-selectable-ready={ready?"true":"false"} className={`mc-selectable-text ${className??""}`} {...props}><span ref={raw} className="mc-selectable-raw">{text}</span><span aria-hidden="true" className="mc-selectable-pixels">{runs.map((run,index)=><span key={index} style={{position:"absolute",left:run.x,top:run.y}}><MinecraftColorUnicodeLabel text={run.text} atlas={minecraftChatAtlas}/></span>)}</span></span>
}
export {MinecraftSelectableText}
