import * as React from "react"
import {Kbd,KbdGroup} from "../registry/ui/kbd"
import {Input} from "../registry/ui/input"
import type {DemoProps} from "../types"
export default function KbdDemo({scale}:DemoProps){const [key,setKey]=React.useState("Space");return <>
 <div className="demo-options"><label className="demo-option">Key label<Input aria-label="Keyboard key label" scale={scale} value={key} onChange={event=>setKey(event.target.value)} className="w-60" /></label></div>
 <div className="demo-stage" data-stage="kbd"><div className="demo-pair"><span className="sample-caption">JUMP</span><Kbd scale={scale}>{key}</Kbd></div><div className="demo-pair"><span className="sample-caption">SHORTCUT</span><KbdGroup><Kbd scale={scale}>Ctrl</Kbd><Kbd scale={scale}>C</Kbd></KbdGroup></div><div className="demo-pair"><span className="sample-caption">UNAVAILABLE</span><Kbd scale={scale} aria-disabled="true">Unbound</Kbd></div></div>
 <div className="demo-result"><span className="status-dot"/><span>Keyboard labels display shortcuts</span></div>
 </>}
