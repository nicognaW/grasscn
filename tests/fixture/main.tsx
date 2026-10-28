import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button, buttonVariants } from "../../registry/ui/button"
import { Checkbox } from "../../registry/ui/checkbox"
import { Slider } from "../../registry/ui/slider"
import { Input } from "../../registry/ui/input"
import "./style.css"

const params = new URLSearchParams(location.search)
const scale = Number(params.get("scale") || 2) as 1 | 2 | 3
const width = Number(params.get("width") || 200)
const state = params.get("state") || "normal"
const label = params.get("label") || "Button"

function Fixture() {
  const [count, setCount] = React.useState(0)
  const [commits, setCommits] = React.useState(0)
  const [refName, setRefName] = React.useState("")
  const sliderRef = React.useRef<HTMLSpanElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = React.useState(params.get("text") ?? "Hello Minecraft")
  const [submitted, setSubmitted] = React.useState(0)
  if (params.get("component") === "input") return <>
    <form id="input-form" onSubmit={event => { event.preventDefault(); setSubmitted(current => current + 1) }}>
      <Input ref={inputRef} id="subject" name="message" aria-label="Test input" scale={scale} style={{ width: width * scale }}
        value={params.has("uncontrolled") ? undefined : inputValue} defaultValue={params.has("uncontrolled") ? params.get("text") ?? "Hello Minecraft" : undefined}
        type={params.get("type") ?? "text"} placeholder={params.get("placeholder") ?? undefined} disabled={state === "disabled"} readOnly={state.includes("readonly")}
        required={params.has("required")} pattern={params.get("pattern") ?? undefined} maxLength={params.has("maxLength") ? Number(params.get("maxLength")) : undefined}
        onChange={event => { setInputValue(event.target.value); setCount(current => current + 1) }} />
      <button id="submit">Submit</button>
      <button type="reset" id="reset">Reset</button>
    </form>
    <output aria-label="Input changes">{count}</output><output aria-label="Input value">{inputValue}</output><output aria-label="Submissions">{submitted}</output>
    <button id="next">Next focus target</button>
    <button id="read-ref" onClick={() => setRefName(inputRef.current?.tagName ?? "missing")}>Read ref</button><output aria-label="Root ref">{refName}</output>
    <button id="imperative" onClick={() => { if (inputRef.current) inputRef.current.value = "Done" }}>Set through ref</button>
  </>
  const [checked, setChecked] = React.useState<boolean | "indeterminate">(params.get("checked") === "mixed" ? "indeterminate" : params.get("checked") === "true")
  const [values, setValues] = React.useState((params.get("values") ?? params.get("value") ?? "500").split(",").map(Number))
  if (params.get("component") === "slider") return <>
    <form id="slider-form">
    <Slider ref={sliderRef} id="subject" name="volume" scale={scale} aria-label="Volume" label={params.get("label") ?? undefined}
      value={params.has("uncontrolled") || params.has("default-range") ? undefined : values} defaultValue={params.has("default-range") ? undefined : values} min={0} max={1000} step={1}
      disabled={state === "disabled"} dir={params.get("dir") === "rtl" ? "rtl" : "ltr"}
      inverted={params.has("inverted")} orientation={params.get("orientation") === "vertical" ? "vertical" : "horizontal"}
      style={params.get("orientation") === "vertical" ? undefined : { width: width * scale }}
      onValueCommit={() => setCommits(current => current + 1)} onValueChange={next => { setValues(next); setCount(current => current + 1) }} />
    </form>
    <output aria-label="Values">{values.join(",")}</output>
    <output aria-label="Changes">{count}</output>
    <output aria-label="Commits">{commits}</output>
    <output aria-label="Root ref">{refName}</output>
    <button id="next">Next focus target</button>
    <button id="read-ref" onClick={() => setRefName(sliderRef.current?.id ?? "missing")}>Read ref</button>
    <button type="reset" form="slider-form" id="reset">Reset</button>
  </>
  if (params.get("component") === "checkbox") return <>
    <Checkbox id="subject" aria-label="Test checkbox" scale={scale} checked={checked}
      disabled={state === "disabled"} onCheckedChange={value => { setChecked(value); setCount(count + 1) }} />
    <output aria-label="Changes">{count}</output>
    <button id="next">Next focus target</button>
  </>
  return <>
    <Button id="subject" scale={scale} disabled={state === "disabled"}
      style={params.has("width") ? { width: width * scale } : undefined} onClick={() => setCount(count + 1)}>{label}</Button>
    <output aria-label="Activations">{count}</output>
    <Button asChild><a href="#destination">Continue</a></Button>
    <Button disabled onClick={() => setCount(count + 100)}>Disabled</Button>
    <Button variant="outline">Outline</Button>
    <a href="#utility" className={buttonVariants()}>Utility link</a>
  </>
}

createRoot(document.getElementById("root")!).render(<Fixture />)
