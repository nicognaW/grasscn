import * as React from "react"
import {Badge} from "../../registry/ui/badge"
import {Input} from "../../registry/ui/input"
import {Button} from "../../registry/ui/button"
import type {DemoProps} from "../types"
export default function BadgeDemo({scale}:DemoProps){const[text,setText]=React.useState("Diamonds!"),[earned,setEarned]=React.useState(true),[clicks,setClicks]=React.useState(0);return <>
 <div className="demo-options"><label className="demo-option">Advancement title<Input aria-label="Badge text" scale={scale} value={text} onChange={event=>setText(event.target.value)} style={{width:140*scale,maxWidth:"100%"}}/></label><Button scale={scale} onClick={()=>setEarned(value=>!value)} style={{width:130*scale,maxWidth:"100%"}}>{earned?"Reset challenge":"Earn challenge"}</Button></div>
 <div className="demo-stage" data-stage="badge" style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:12*scale}}><div className="demo-pair" style={{maxWidth:"100%"}}><span className="sample-caption">CHALLENGE</span><Badge scale={scale} earned={earned}>{text}</Badge></div><div className="demo-pair" style={{maxWidth:"100%"}}><span className="sample-caption">TASK</span><Badge scale={scale} achievement="task">New recipe</Badge></div><div className="demo-pair" style={{maxWidth:"100%"}}><span className="sample-caption">GOAL / LINK</span><Badge scale={scale} achievement="goal" asChild><a href="#badge" onClick={()=>setClicks(v=>v+1)}>View recipes</a></Badge></div></div>
 <div className="demo-result"><span className="status-dot"/><output aria-label="Badge achievement state">{earned?"Challenge complete!":"Challenge not yet earned"}</output><output aria-label="Badge link activations">Opened {clicks} times</output></div>
 </>}
