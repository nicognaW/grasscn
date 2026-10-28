import * as React from "react"
import { Slider } from "../../registry/ui/slider"
import type { DemoProps } from "../types"

export default function SliderDemo({ scale }: DemoProps) {
  const [value, setValue] = React.useState([50])
  return <>
    <div className="demo-stage slider-stage" data-stage="slider">
      <div className="demo-pair"><span className="sample-caption">INTERACTIVE</span><Slider scale={scale} value={value} onValueChange={setValue} aria-label="Volume" label={`Volume: ${value[0]}%`} /></div>
      <div className="demo-pair"><span className="sample-caption">DISABLED</span><Slider scale={scale} value={[50]} aria-label="Disabled volume" label="Volume: 50%" disabled /></div>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /><output aria-label="Slider value">{value[0]}%</output><span>Single thumb · horizontal</span></div>
  </>
}
