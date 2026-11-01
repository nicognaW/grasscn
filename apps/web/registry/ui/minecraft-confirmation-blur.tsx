import * as React from "react"
import { useConfirmationSnapshot } from "./minecraft-confirmation-snapshot"

// Screen's post-effect is six alternating box passes, not a Gaussian blur.
// This SVG path is still under native pixel verification.
export function MinecraftConfirmationBlur({radius,identity}:{radius:number;identity:string}) {
  const ref=React.useRef<SVGSVGElement>(null),id=React.useId().replace(/[^a-zA-Z0-9_-]/g,"")
  const canvas=React.useRef<HTMLCanvasElement>(null),ready=useConfirmationSnapshot(canvas,identity,radius)
  const size=2*Math.max(0,Math.round(radius))+1
  React.useLayoutEffect(()=>{
    const host=ref.current!.parentElement!
    if(radius>0&&!ready)host.style.backdropFilter=`url(#${id})`
    else host.style.removeProperty("backdrop-filter")
    host.dataset.mcConfirmationBackdropReady="true"
    return()=>{host.style.removeProperty("backdrop-filter");delete host.dataset.mcConfirmationBackdropReady}
  },[id,radius,ready])
  return <><svg ref={ref} width="0" height="0" aria-hidden="true" style={{position:"absolute",pointerEvents:"none"}}><defs><filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">{Array.from({length:radius>0 ? 6 : 0},(_,pass)=><feConvolveMatrix key={pass} order={pass%2 ? `1 ${size}` : `${size} 1`} kernelMatrix={Array(size).fill(1).join(" ")} divisor={size} edgeMode="duplicate" preserveAlpha/>)}</filter></defs></svg><canvas ref={canvas} aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",visibility:ready&&radius>0 ? "visible" : "hidden"}}/></>
}
