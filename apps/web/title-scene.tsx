import * as React from "react"
import {MinecraftText} from "./registry/ui/minecraft-text"
import {minecraftGlyphs} from "./registry/ui/minecraft-font"
import {splashMotion,splashTransform} from "./splash-motion"
import title from "./assets/grasscn-title.svg"

const splash="Now with components!"
const splashWidth=Array.from(splash).reduce((width,char)=>width+minecraftGlyphs[char.charCodeAt(0)-32][2],0)
export function TitleScene(){
 const ref=React.useRef<HTMLDivElement>(null)
 React.useLayoutEffect(()=>{
  const node=ref.current!,splashNode=node.querySelector<HTMLElement>('.grass-title-splash')!,motion=matchMedia('(prefers-reduced-motion: reduce)')
  let frame=0,visible=true,guiScale=1
  const paint=(time:number)=>{splashNode.style.transform=splashTransform(splashMotion(time,splashWidth),guiScale)}
  const tick=()=>{paint(performance.now());frame=requestAnimationFrame(tick)}
  const sync=()=>{
   cancelAnimationFrame(frame)
   guiScale=Number(getComputedStyle(node).getPropertyValue('--title-gui-scale'))||1
   const running=visible&&!document.hidden&&!motion.matches
   splashNode.dataset.motion=running?'running':'paused'
   if(running){paint(performance.now());frame=requestAnimationFrame(tick)}else paint(0)
  }
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()}),resize=new ResizeObserver(sync)
  observer.observe(node);resize.observe(node);document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);sync()
  return()=>{cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',sync);motion.removeEventListener('change',sync)}
 },[])
 return <div ref={ref} className="grass-title-scene">
  <h1 id="grass-title"><span className="sr-only">grasscn</span><img src={title} width="260" height="64" alt="" aria-hidden="true"/></h1>
  <span className="grass-title-splash"><span className="grass-title-splash-origin" style={{left:-Math.trunc(splashWidth/2),top:-8}}><MinecraftText>{splash}</MinecraftText></span></span>
 </div>
}
