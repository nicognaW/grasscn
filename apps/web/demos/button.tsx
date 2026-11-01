import * as React from "react"
import { Button } from "../registry/ui/button"
import { Input } from "../registry/ui/input"
import type { DemoProps } from "../types"

export default function ButtonDemo({ scale }: DemoProps) {
  const [label, setLabel] = React.useState("Button")
  const [width, setWidth] = React.useState(200)
  const [count, setCount] = React.useState(0)
  return <>
    <div className="demo-options">
      <label>Label<Input aria-label="Button label" value={label} maxLength={24} onChange={event => setLabel(event.target.value)} /></label>
      <Button className="width-picker" aria-label={`Button width: ${width} px`} onClick={() => {
        const widths = [103, 150, 200, 257]
        setWidth(widths[(widths.indexOf(width) + 1) % widths.length])
      }}>{`Width: ${width} px`}</Button>
    </div>
    <div className="demo-stage" data-stage="button">
      <div className="demo-pair"><span className="sample-caption">INTERACTIVE</span><Button scale={scale} style={{ width: width * scale }} onClick={() => setCount(value => value + 1)}>{label || " "}</Button></div>
      <div className="demo-pair"><span className="sample-caption">DISABLED</span><Button scale={scale} style={{ width: width * scale }} disabled>{label || " "}</Button></div>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /> <output aria-label="Button activations">{count === 0 ? "Ready to click" : `Pressed ${count} ${count === 1 ? "time" : "times"}`}</output><span>Vanilla button</span></div>
  </>
}
