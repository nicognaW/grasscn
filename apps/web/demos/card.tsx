import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../registry/ui/card"
import { Button } from "../registry/ui/button"
import { Input } from "../registry/ui/input"
import type { DemoProps } from "../types"

export default function CardDemo({ scale }: DemoProps) {
  const [name, setName] = React.useState("Minecraft")
  const [saved, setSaved] = React.useState(false)
  return <>
    <div className="demo-stage" data-stage="card">
      <div className="demo-pair w-(--demo-width) demo-pair-max-width-full" style={/* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */({"--demo-width": `${236 * scale}px`} satisfies DemoVariables) as DemoVariables}>
        <Card scale={scale} style={{ width: "100%" }}>
          <CardHeader><CardTitle>World Settings</CardTitle><CardDescription>Change your world options.</CardDescription></CardHeader>
          <CardContent><label htmlFor="preview-world-name" className="block mb-(--demo-margin-bottom)" style={/* SAFETY: satisfies checks --demo-margin-bottom against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */({"--demo-margin-bottom": `${6 * scale}px`} satisfies DemoVariables) as DemoVariables}>World name</label><Input id="preview-world-name" scale={scale} className="w-full"  value={name} onChange={event => { setName(event.target.value); setSaved(false) }} /></CardContent>
          <CardFooter><Button scale={scale} onClick={() => setSaved(true)}>Done</Button></CardFooter>
        </Card>
      </div>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /><output aria-label="Card status">{saved ? "Settings saved" : "Edit your world name"}</output><span>Popup panel</span></div>
  </>
}
