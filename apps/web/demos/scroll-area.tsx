import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import { ScrollArea } from "../registry/ui/scroll-area"
import { Button } from "../registry/ui/button"
import type { DemoProps } from "../types"

export default function ScrollAreaDemo({ scale }: DemoProps) {
  const viewport = React.useRef<HTMLDivElement>(null)
  const [offset, setOffset] = React.useState(0), [selected, setSelected] = React.useState<number>()
  const [disabled, setDisabled] = React.useState(false)
  const jump = (fraction: number) => {
    const node = viewport.current!
    node.scrollTop = (node.scrollHeight - node.clientHeight) * fraction
  }
  return <>
    <div className="demo-options">
      <Button aria-label="Scroll to top" onClick={() => jump(0)}>Top</Button>
      <Button aria-label="Scroll to middle" onClick={() => jump(.5)}>Middle</Button>
      <Button aria-label="Scroll to bottom" onClick={() => jump(1)}>Bottom</Button>
      <Button aria-pressed={disabled} onClick={() => setDisabled(current => !current)}>{`Scrolling: ${disabled ? "Off" : "On"}`}</Button>
    </div>
    <div className="demo-stage" data-stage="scroll-area">
      <div className="demo-pair"><span className="sample-caption">VERTICAL SCROLLING</span>
        <ScrollArea role="region" aria-label="Demo scroll area" scale={scale} disabled={disabled} viewportRef={viewport} viewportProps={{ "aria-label": "Scrollable rows", onScroll: event => setOffset(Math.round(event.currentTarget.scrollTop / scale)) }} style={{ width: 200 * scale, maxWidth: "100%", height: 64 * scale }}>
          <div className="h-(--demo-height) overflow-hidden" style={({"--demo-height": `${2400 * scale}px`} satisfies DemoVariables) as DemoVariables}>{Array.from({ length: 100 }, (_, index) => <div key={index} className="h-(--demo-height) flex items-start" style={({"--demo-height": `${24 * scale}px`} satisfies DemoVariables) as DemoVariables}><Button scale={scale} className="w-full"  onClick={() => setSelected(index + 1)}>{`Row ${index + 1}`}</Button></div>)}</div>
        </ScrollArea>
      </div>
    </div>
    <div className="demo-result"><span className="status-dot" /><output aria-label="Scroll area offset">{offset} px</output><span>{selected == null ? "Select a row" : `Selected Row ${selected}`}</span></div>
  </>
}
