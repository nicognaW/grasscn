import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import {Spinner} from "../registry/ui/spinner"
import {Button} from "../registry/ui/button"
import type {DemoProps} from "../types"
export default function SpinnerDemo({scale}:DemoProps){const [paused,setPaused]=React.useState(false),[time,setTime]=React.useState(0);return <><div className="demo-options"><Button scale={scale} className="w-(--demo-width)" style={({"--demo-width": `${90*scale}px`} satisfies DemoVariables) as DemoVariables} onClick={()=>setPaused(value=>!value)}>{paused?"Animate":"Pause"}</Button><Button scale={scale} className="w-(--demo-width)" style={({"--demo-width": `${90*scale}px`} satisfies DemoVariables) as DemoVariables} disabled={!paused} onClick={()=>setTime(value=>value+300)}>Next phase</Button></div><div className="demo-stage" data-stage="spinner"><Spinner scale={scale} timeMs={paused?time:undefined} aria-label="Loading world"/></div><div className="demo-result"><span className="status-dot"/><span>Loading indicator</span></div></>}
