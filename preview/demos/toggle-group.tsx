import * as React from "react"
import {ToggleGroup,ToggleGroupItem} from "../../registry/ui/toggle-group"
import {Button} from "../../registry/ui/button"
import {Label} from "../../registry/ui/label"
import type {DemoProps} from "../types"
import {useDemoWidth} from "../use-demo-width"
export default function ToggleGroupDemo({scale}:DemoProps){
 const stage=useDemoWidth(scale),id=React.useId()
 const [single,setSingle]=React.useState("crafting"),[multiple,setMultiple]=React.useState<string[]>(["crafting"]),[disabled,setDisabled]=React.useState(false)
 const filters=[{value:"crafting",label:"Crafting recipes"},{value:"furnace",label:"Furnace recipes"},{value:"stonecutter",label:"Stonecutter recipes"}]
 return <>
 <div className="demo-options"><Button onClick={()=>setDisabled(v=>!v)}>{disabled?"Enable filters":"Disable filters"}</Button><Button onClick={()=>{setSingle("crafting");setMultiple(["crafting"])}}>Reset filters</Button></div>
 <div ref={stage.ref} className="demo-stage" data-stage="toggle-group"><div className="demo-pair"><Label scale={scale} maxWidth={stage.width}>One crafting station</Label><ToggleGroup className="demo-filter-choices" type="single" aria-label="One recipe station" scale={scale} value={single} onValueChange={setSingle} disabled={disabled}>{filters.map(f=><div className="demo-filter-choice" key={f.value}><ToggleGroupItem id={`${id}-single-${f.value}`} value={f.value} aria-label={f.label}/><Label htmlFor={`${id}-single-${f.value}`} scale={scale}>{f.label.replace(" recipes","")}</Label></div>)}</ToggleGroup></div><div className="demo-pair"><Label scale={scale} maxWidth={stage.width}>Several crafting stations</Label><ToggleGroup className="demo-filter-choices" type="multiple" aria-label="Several recipe stations" scale={scale} value={multiple} onValueChange={setMultiple} disabled={disabled}>{filters.map(f=><div className="demo-filter-choice" key={f.value}><ToggleGroupItem id={`${id}-multiple-${f.value}`} value={f.value} aria-label={f.label}/><Label htmlFor={`${id}-multiple-${f.value}`} scale={scale}>{f.label.replace(" recipes","")}</Label></div>)}</ToggleGroup></div></div>
 <div className="demo-result"><span className="status-dot"/><output aria-label="Single recipe station">{single||"None"}</output><output aria-label="Multiple recipe stations">{multiple.join(", ")||"None"}</output></div>
 </>
}
