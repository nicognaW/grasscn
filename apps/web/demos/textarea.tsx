import * as React from "react"
import { Textarea } from "../registry/ui/textarea"
import type { DemoProps } from "../types"
const initialText = "Line one\nLine two\nLine three"

export default function TextareaDemo({ scale }: DemoProps) {
  const [value, setValue] = React.useState(initialText)
  return <>
    <div className="demo-stage" data-stage="textarea">
      <div className="demo-pair"><label className="sample-caption" htmlFor="preview-textarea">EDITABLE</label><Textarea id="preview-textarea" aria-label="Demo textarea" scale={scale} value={value} onChange={event => setValue(event.target.value)} placeholder="Write a message..." /></div>
      <div className="demo-pair"><label className="sample-caption" htmlFor="preview-textarea-readonly">READ ONLY</label><Textarea id="preview-textarea-readonly" aria-label="Read-only demo textarea" scale={scale} value={initialText} readOnly /></div>
      <div className="demo-pair"><label className="sample-caption" htmlFor="preview-textarea-disabled">DISABLED</label><Textarea id="preview-textarea-disabled" aria-label="Disabled demo textarea" scale={scale} value={initialText} disabled /></div>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /><output aria-label="Textarea character count">{value.length} characters</output><span>Multiline text editing</span></div>
  </>
}
