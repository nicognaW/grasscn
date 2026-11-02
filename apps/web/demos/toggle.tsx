import * as React from "react"
import {Toggle} from "../registry/ui/toggle"
import {Input} from "../registry/ui/input"
import {Button} from "../registry/ui/button"
import {Label} from "../registry/ui/label"
import type {DemoProps} from "../types"

import {useDemoWidth} from "../use-demo-width"
export default function ToggleDemo({scale}:DemoProps){
 const stage=useDemoWidth(scale);const [pressed,setPressed]=React.useState(false),[disabled,setDisabled]=React.useState(false),[label,setLabel]=React.useState("Only craftable recipes")
 return <>
  <div className="demo-options"><label className="demo-option">Filter label<Input aria-label="Toggle filter label" value={label} onChange={event=>setLabel(event.target.value)} className="w-75" /></label><Button onClick={()=>setDisabled(v=>!v)}>{disabled?"Enable filter":"Disable filter"}</Button></div>
  <div ref={stage.ref} className="demo-stage" data-stage="toggle"><div className="demo-pair"><Label htmlFor="preview-toggle" scale={scale} maxWidth={stage.width}>{label||" "}</Label><Toggle id="preview-toggle" aria-label={label||"Recipe filter"} scale={scale} pressed={pressed} onPressedChange={setPressed} disabled={disabled}/></div><div className="demo-pair"><span className="sample-caption">LOCKED FILTER</span><Toggle aria-label="Locked recipe filter" scale={scale} defaultPressed disabled/></div></div>
  <div className="demo-result"><span className="status-dot"/><output aria-label="Recipe filter state">{pressed?"Craftable recipes":"All recipes"}</output><span>Filter your results</span></div>
 </>
}
