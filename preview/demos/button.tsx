import * as React from "react"
import { Button } from "../../registry/ui/button"
import type { DemoProps } from "../types"

export default function ButtonDemo({ scale }: DemoProps) {
  const [label, setLabel] = React.useState("Button")
  const [width, setWidth] = React.useState(200)
  const [count, setCount] = React.useState(0)
  return <>
    <div className="demo-options">
      <label>Label<input aria-label="Button label" value={label} maxLength={24} onChange={event => setLabel(event.target.value.replace(/[^\x20-\x7e]/g, ""))} /></label>
      <label>Width<select aria-label="Button width" value={width} onChange={event => setWidth(Number(event.target.value))}>
        <option value={103}>103 px</option><option value={150}>150 px</option><option value={200}>200 px</option><option value={257}>257 px</option>
      </select></label>
    </div>
    <div className="demo-stage" data-stage="button">
      <div className="demo-pair"><span className="sample-caption">INTERACTIVE</span><Button scale={scale} style={{ width: width * scale }} onClick={() => setCount(value => value + 1)}>{label || " "}</Button></div>
      <div className="demo-pair"><span className="sample-caption">DISABLED</span><Button scale={scale} style={{ width: width * scale }} disabled>{label || " "}</Button></div>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /> <output aria-label="Button activations">{count === 0 ? "Ready to click" : `Pressed ${count} ${count === 1 ? "time" : "times"}`}</output><span>Default variant</span></div>
  </>
}
