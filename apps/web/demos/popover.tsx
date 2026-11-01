import * as React from "react"
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription } from "../registry/ui/popover"
import { Button } from "../registry/ui/button"
import { Input } from "../registry/ui/input"
import { Textarea } from "../registry/ui/textarea"
import type { DemoProps } from "../types"

export default function PopoverDemo({ scale }: DemoProps) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("World Settings")
  const [message, setMessage] = React.useState("Configure your world.")
  const [name, setName] = React.useState("Minecraft")
  const [saved, setSaved] = React.useState(false)
  return <>
    <div className="demo-options">
      <label className="demo-option">Title<Input aria-label="Popover title" value={title} onChange={event => setTitle(event.target.value)} style={{ width: 240 }} /></label>
      <label className="demo-option">Message<Textarea aria-label="Popover message" value={message} onChange={event => setMessage(event.target.value)} style={{ width: 320, height: 100 }} /></label>
    </div>
    <div className="demo-stage" data-stage="popover">
      <Popover scale={scale} open={open} onOpenChange={setOpen}>
        <PopoverTrigger>Open world options</PopoverTrigger>
        <PopoverContent collisionPadding={8}>
          <PopoverHeader><PopoverTitle>{title || " "}</PopoverTitle><PopoverDescription>{message}</PopoverDescription></PopoverHeader>
          <form style={{ display: "grid", gap: 6 * scale }} onSubmit={event => { event.preventDefault(); setSaved(true); setOpen(false) }}>
            <label htmlFor="preview-popover-world">World name</label>
            <Input id="preview-popover-world" scale={scale} value={name} onChange={event => { setName(event.target.value); setSaved(false) }} style={{ width: "100%" }} />
            <Button type="submit" scale={scale} style={{ width: "100%" }}>Done</Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /><output aria-label="Popover status">{saved ? "World settings saved" : "Open your world options"}</output><span>Popup panel</span></div>
  </>
}
