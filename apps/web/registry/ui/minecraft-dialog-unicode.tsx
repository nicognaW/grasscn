import * as React from "react"
import { minecraftGlyphs } from "./minecraft-font"
import { minecraftInputAssets } from "./minecraft-input-assets"
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont"
import { positionUnihex, disposeUnihex, setUnihexAtlas, paintUnihexGPU } from "./minecraft-dialog-gpu"
import { dialogUnihexAtlas } from "./minecraft-dialog-atlas"

let alpha: Promise<Uint8ClampedArray> | undefined
function loadAlpha() {
  return alpha ??= new Promise((resolve,reject)=>{
    const image=new Image()
    image.onload=()=>{const c=document.createElement("canvas");c.width=c.height=128;const context=c.getContext("2d")!;context.drawImage(image,0,0);resolve(context.getImageData(0,0,128,128).data)}
    image.onerror=reject;image.src=minecraftInputAssets.atlas
  })
}
export function DialogUnicodeLine({text,bold,scale,width}:{text:string;bold:boolean;scale:number;width:number}) {
  const ref=React.useRef<HTMLCanvasElement>(null),[ready,setReady]=React.useState(false)
  React.useLayoutEffect(()=>{
    let disposed=false,frame=0,signature=""
    const canvas=ref.current!,context=canvas.getContext("2d")!
    setUnihexAtlas(context,dialogUnihexAtlas);setReady(false)
    Promise.all([loadUnihex(),loadAlpha()]).then(([,pixels])=>{
      if(disposed)return
      const tick=()=>{
        if(disposed)return
        const bounds=canvas.getBoundingClientRect(),next=JSON.stringify([bounds.x,bounds.y,innerWidth,innerHeight])
        if(next!==signature){
          signature=next;canvas.width=Math.max(1,width*scale);canvas.height=9*scale;context.imageSmoothingEnabled=false;positionUnihex(context,bounds)
          for(const shadow of [true,false]){
            context.fillStyle=shadow ? "#3f3f3f" : "#ffffff"
            let x=0
            for(const char of text){
              const ascii=minecraftGlyphs[char.codePointAt(0)!-32],uni=getUnihexGlyph(char),offset=ascii ? 1 : .5
              for(let copy=0;copy<(bold ? 2 : 1);copy++){
                const dx=x+copy*offset+(shadow ? offset : 0),dy=shadow ? offset : 0
                if(ascii){
                  if(char!==" ")for(let y=0;y<8;y++)for(let px=0;px<8;px++)if(pixels[((ascii[1]+y)*128+ascii[0]+px)*4+3])context.fillRect((dx+px)*scale,(dy+y)*scale,scale,scale)
                }else if(uni)paintUnihexGPU(context,uni,dx,dy,scale,bold ? .1 : 0)
              }
              x+=(ascii?.[2] ?? uni?.advance ?? 0)+(bold ? offset : 0)
            }
          }
          setReady(true)
        }
        frame=requestAnimationFrame(tick)
      }
      tick()
    })
    return()=>{disposed=true;cancelAnimationFrame(frame);disposeUnihex(context)}
  },[text,bold,scale,width])
  return <canvas ref={ref} data-mc-dialog-unicode-ready={ready} aria-hidden="true" style={{display:"block",width:width*scale,height:9*scale}}/>
}
