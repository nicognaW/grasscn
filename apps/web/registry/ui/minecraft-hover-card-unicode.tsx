import * as React from "react"
import {minecraftGlyphs} from "./minecraft-font"
import {minecraftInputAssets} from "./minecraft-input-assets"
import {getUnihexGlyph,loadUnihex} from "./minecraft-unifont"
import {hoverCardGlyphAtlas} from "./minecraft-hover-card-atlas"
import {positionHoverCardGlyphs,paintHoverCardGlyph,disposeHoverCardGlyphs} from "./minecraft-hover-card-gpu"
let alpha:Promise<Uint8ClampedArray>|undefined
function loadAlpha(){return alpha??=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const c=document.createElement("canvas");c.width=c.height=128;const context=c.getContext("2d")!;context.drawImage(image,0,0);resolve(context.getImageData(0,0,128,128).data)};image.onerror=reject;image.src=minecraftInputAssets.atlas})}
export function HoverCardUnicodeLine({text,bold,scale,width}:{text:string;bold:boolean;scale:number;width:number}) {
  const ref=React.useRef<HTMLCanvasElement>(null),[ready,setReady]=React.useState(false)
  React.useLayoutEffect(()=>{
    let disposed=false,frame=0,signature=""
    const canvas=ref.current!,context=canvas.getContext("2d")!
    setReady(false)
    Promise.all([loadUnihex(),loadAlpha()]).then(([,source])=>{
      if(disposed)return
      const glyphs=Array.from(text).map(char=>{
        const code=char.codePointAt(0)!,ascii=minecraftGlyphs[code-32],uni=getUnihexGlyph(char),observed=hoverCardGlyphAtlas[code.toString(16)]
        const w=observed ? Math.round((observed.u1-observed.u0)*256+.02) : ascii ? 8 : uni?.width??0,h=ascii ? 8 : 16,pixels=new Uint8Array(w*h*4)
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const on=ascii ? source[((ascii[1]+y)*128+ascii[0]+x)*4+3] : uni ? ((uni.rows[y]>>>(uni.bitWidth-1-x-uni.left))&1)*255 : 0;pixels.set([255,255,255,on],(y*w+x)*4)}
        return {code,char,pixels,w,h,advance:observed?.advance??ascii?.[2]??uni?.advance??0,boldOffset:observed?.boldOffset??(ascii ? 1 : .5),shadowOffset:observed?.shadowOffset??(ascii ? 1 : .5)}
      })
      const tick=()=>{
        if(disposed)return
        const bounds=canvas.getBoundingClientRect(),next=JSON.stringify([bounds.x,bounds.y,innerWidth,innerHeight])
        if(next!==signature){
          signature=next;canvas.width=Math.max(1,width*scale);canvas.height=9*scale;context.imageSmoothingEnabled=false;positionHoverCardGlyphs(context,bounds)
          let supported=true
          let x=0;for(const glyph of glyphs){for(const shadow of [true,false]){context.fillStyle=shadow ? "#3f3f3f" : "#ffffff";if(glyph.char!==" ")for(let copy=0;copy<(bold ? 2 : 1);copy++)supported=paintHoverCardGlyph(context,glyph.code,glyph.pixels,glyph.w,glyph.h,x+copy*glyph.boldOffset+(shadow ? glyph.shadowOffset : 0),shadow ? glyph.shadowOffset : 0,scale,bold)&&supported}x+=glyph.advance+(bold ? glyph.boldOffset : 0)}
          setReady(supported)
        }
        frame=requestAnimationFrame(tick)
      }
      tick()
    })
    return()=>{disposed=true;cancelAnimationFrame(frame);disposeHoverCardGlyphs(context)}
  },[text,bold,scale,width])
  return <span style={{position:"relative",display:"block",width:width*scale,height:9*scale}}><canvas ref={ref} data-mc-hover-card-unicode-ready={ready} aria-hidden="true" style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",visibility:ready ? "visible" : "hidden"}}/><span style={{visibility:ready ? "hidden" : "visible"}}>{text}</span></span>
}
