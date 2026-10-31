"use client"
import * as React from "react"
import {AdventureImage} from "./minecraft-adventure-image"
import {MinecraftDocumentText} from "./minecraft-document-text"
import {playBookPageTurn} from "./minecraft-book-sound"
import "./minecraft-book.css"
type BookProps=React.ComponentProps<'div'>&{pages:readonly string[];page?:number;defaultPage?:number;onPageChange?:(page:number)=>void;scale?:1|2|3;turnSound?:boolean}
function Book({pages,page,defaultPage=0,onPageChange,scale=2,turnSound=true,className,style,onKeyDown,...props}:BookProps){const[current,setCurrent]=React.useState(defaultPage),[hover,setHover]=React.useState<'forward'|'backward'|null>(null),index=Math.max(0,Math.min(Math.max(0,pages.length-1),page??current));const change=(next:number,sound=false)=>{if(next<0||next>=pages.length||next===index)return;if(page===undefined)setCurrent(next);onPageChange?.(next);if(sound&&turnSound)playBookPageTurn()};return <div {...props} data-slot="book" className={`mc-book ${className??''}`} tabIndex={props.tabIndex??0} role={props.role??'group'} aria-label={props['aria-label']??'Book'} style={{'--mc-scale':scale,width:192*scale,height:192*scale,...style} as React.CSSProperties} onKeyDown={event=>{onKeyDown?.(event);if(event.defaultPrevented)return;if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();change(index+1)}if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();change(index-1)}}}>
 <AdventureImage texture="gui/book" scale={scale} style={{position:'absolute',left:0,top:0,maxWidth:'none'}}/>
 <MinecraftDocumentText text={`Page ${index+1} of ${Math.max(1,pages.length)}`} width={114} scale={scale} align="right" style={{position:'absolute',left:34*scale,top:16*scale}}/>
 <div className="mc-book-page" role="document" aria-label={`Page ${index+1}`} style={{left:36*scale,top:30*scale,width:114*scale,height:128*scale}}><MinecraftDocumentText text={pages[index]??''} width={114} scale={scale}/></div>
 {(['backward','forward'] as const).map(direction=>{const visible=direction==='backward'?index>0:index<pages.length-1;return visible&&<button type="button" key={direction} className="mc-book-arrow" aria-label={direction==='forward'?'Next page':'Previous page'} onMouseEnter={()=>setHover(direction)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(direction)} onBlur={()=>setHover(null)} onClick={()=>change(index+(direction==='forward'?1:-1),true)} style={{left:(direction==='forward'?116:43)*scale,top:157*scale,width:23*scale,height:13*scale}}><AdventureImage texture={`gui/sprites/widget/page_${direction}${hover===direction?'_highlighted':''}`} scale={scale}/></button>})}
 </div>}
export {Book}
export type {BookProps}
