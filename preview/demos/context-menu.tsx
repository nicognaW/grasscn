import * as React from "react"
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup,
  ContextMenuLabel, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup,
  ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub,
  ContextMenuSubTrigger, ContextMenuPortal, ContextMenuSubContent,
} from "../../registry/ui/context-menu"
import { Card, CardHeader, CardTitle, CardDescription } from "../../registry/ui/card"
import { Input } from "../../registry/ui/input"
import type { DemoProps } from "../types"

export default function ContextMenuDemo({ scale }: DemoProps) {
  const [title, setTitle] = React.useState("World Settings")
  const [action, setAction] = React.useState("Resume game")
  const [coordinates, setCoordinates] = React.useState(false)
  const [mode, setMode] = React.useState("world")
  const [lastAction, setLastAction] = React.useState("Choose a world option")
  return <>
    <div className="demo-options">
      <label className="demo-option">Title<Input aria-label="Context menu title" value={title} onChange={event => setTitle(event.target.value)} style={{ width: 240 }} /></label>
      <label className="demo-option">Action<Input aria-label="Context menu action" value={action} onChange={event => setAction(event.target.value)} style={{ width: 240 }} /></label>
    </div>
    <div className="demo-stage" data-stage="context-menu">
      <ContextMenu scale={scale}>
        <ContextMenuTrigger asChild>
          <Card scale={scale} tabIndex={0} aria-label="World context menu target" style={{ width: 200 * scale, maxWidth: "100%", minHeight: 80 * scale }}>
            <CardHeader><CardTitle>{title || " "}</CardTitle><CardDescription>Right click or touch and hold.</CardDescription></CardHeader>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent collisionPadding={8}>
          <ContextMenuLabel>{title || " "}</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem onSelect={() => setLastAction(action)}>{action || " "}<ContextMenuShortcut>Esc</ContextMenuShortcut></ContextMenuItem>
            <ContextMenuItem disabled>Unavailable</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={coordinates} onCheckedChange={setCoordinates} onSelect={event => event.preventDefault()}>Show coordinates</ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value={mode} onValueChange={setMode}>
            <ContextMenuRadioItem value="world" onSelect={event => event.preventDefault()}>World</ContextMenuRadioItem>
            <ContextMenuRadioItem value="game" onSelect={event => event.preventDefault()}>Game</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
            <ContextMenuPortal>
              <ContextMenuSubContent collisionPadding={8}>
                <ContextMenuItem onSelect={() => setLastAction("Video settings")}>Video settings</ContextMenuItem>
                <ContextMenuItem onSelect={() => setLastAction("Audio settings")}>Audio settings</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuPortal>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /><output aria-label="Context menu status">{lastAction}</output><span>{coordinates ? "Coordinates on" : "Coordinates off"} / {mode}</span></div>
  </>
}
