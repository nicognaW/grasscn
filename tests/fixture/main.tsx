import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button, buttonVariants } from "../../registry/ui/button"
import "./style.css"

const params = new URLSearchParams(location.search)
const scale = Number(params.get("scale") || 2) as 1 | 2 | 3
const width = Number(params.get("width") || 200)
const state = params.get("state") || "normal"
const label = params.get("label") || "Button"

function Fixture() {
  const [count, setCount] = React.useState(0)
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
