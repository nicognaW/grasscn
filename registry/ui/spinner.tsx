"use client"

import * as React from "react"
import {minecraftLoadingGlyphs} from "./minecraft-loading-glyphs"
import "./minecraft-spinner.css"

const frames=["O o o","o O o","o o O","o O o"] as const
function Spinner({className,scale=2,timeMs,logicalWidth=26,style,children,...props}:React.ComponentProps<"svg">&{scale?:1|2|3;timeMs?:number;logicalWidth?:number}){
 const [time,setTime]=React.useState(0)
 React.useEffect(()=>{if(timeMs!=null)return;let frame=0;const motion=matchMedia("(prefers-reduced-motion: reduce)");const tick=()=>{setTime(motion.matches?0:Math.floor(performance.now()/300)*300);frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[timeMs])
 const text=frames[Math.floor(Math.max(0,timeMs??time)/300)%4],pixels:Array<[number,number]>=[];let x=Math.floor(logicalWidth/2)-13;for(const char of text){if(char===" "){x+=4;continue}const glyph=minecraftLoadingGlyphs[char as "O"|"o"];for(const [px,py] of glyph.pixels)pixels.push([x+px,py]);x+=glyph.advance}
 return <svg data-slot="spinner" role="status" aria-label="Loading" viewBox={`0 0 ${logicalWidth} 9`} width={logicalWidth*scale} height={9*scale} className={`mc-spinner ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}><g aria-hidden="true" fill="#202020">{pixels.map(([x,y],index)=><rect key={index} x={x+1} y={y+1} width="1" height="1"/>)}</g><g aria-hidden="true" fill="#808080">{pixels.map(([x,y],index)=><rect key={index} x={x} y={y} width="1" height="1"/>)}</g>{children}</svg>
}
export {Spinner}
