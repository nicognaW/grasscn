import * as React from "react"
import { RadioGroup, RadioGroupItem } from "../registry/ui/radio-group"
import { Label } from "../registry/ui/label"
import { Input } from "../registry/ui/input"
import { Button } from "../registry/ui/button"
import type { DemoProps } from "../types"

export default function RadioGroupDemo({ scale }: DemoProps) {
  const [value, setValue] = React.useState("survival")
  const [first, setFirst] = React.useState("Survival")
  const [disabled, setDisabled] = React.useState(false)
  const choices = [{ value: "survival", label: first || " " }, { value: "creative", label: "Creative" }, { value: "adventure", label: "Adventure" }]
  return <>
    <div className="demo-options"><label className="demo-option">First choice<Input aria-label="First radio choice" value={first} onChange={event => setFirst(event.target.value)} style={{ width: 180 }} /></label><Button aria-pressed={disabled} onClick={() => setDisabled(current => !current)}>{`Group: ${disabled ? "Disabled" : "Enabled"}`}</Button><Button onClick={() => setValue("")}>Clear choice</Button></div>
    <div className="demo-stage" data-stage="radio-group">
      <div className="demo-pair"><span className="sample-caption">GAME MODE</span><RadioGroup scale={scale} aria-label="Demo radio game mode" value={value} onValueChange={setValue} disabled={disabled}>{choices.map(choice => <div key={choice.value} style={{ display: "flex", alignItems: "center" }}><RadioGroupItem id={`preview-radio-${choice.value}`} value={choice.value} /><Label htmlFor={`preview-radio-${choice.value}`} scale={scale}>{choice.label}</Label></div>)}</RadioGroup></div>
      <div className="demo-pair"><span className="sample-caption">UNAVAILABLE CHOICE</span><RadioGroup scale={scale} aria-label="Disabled radio example" defaultValue="locked" disabled><div style={{ display: "flex", alignItems: "center" }}><RadioGroupItem id="preview-radio-locked" value="locked" /><Label htmlFor="preview-radio-locked" scale={scale}>Locked setting</Label></div></RadioGroup></div>
    </div>
    <div className="demo-result"><span className="status-dot" /><output aria-label="Selected radio game mode">{choices.find(choice => choice.value === value)?.label ?? "No choice"}</output><span>One choice at a time</span></div>
  </>
}
