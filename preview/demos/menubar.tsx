import * as React from "react"
import {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarGroup,
  MenubarLabel, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup,
  MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub,
  MenubarSubTrigger, MenubarPortal, MenubarSubContent,
} from "../../registry/ui/menubar"
import { Input } from "../../registry/ui/input"
import type { DemoProps } from "../types"

export default function MenubarDemo({ scale }: DemoProps) {
  const [title, setTitle] = React.useState("Game")
  const [action, setAction] = React.useState("Resume game")
  const [coordinates, setCoordinates] = React.useState(false)
  const [mode, setMode] = React.useState("world")
  const [lastAction, setLastAction] = React.useState("Choose a world option")
  return <>
    <div className="demo-options">
      <label className="demo-option">Title<Input aria-label="Menubar title" value={title} onChange={event => setTitle(event.target.value)} style={{ width: 240 }} /></label>
      <label className="demo-option">Action<Input aria-label="Menubar action" value={action} onChange={event => setAction(event.target.value)} style={{ width: 240 }} /></label>
    </div>
    <div className="demo-stage" data-stage="menubar">
      <Menubar scale={scale} aria-label="World command bar">
        <MenubarMenu value="game">
        <MenubarTrigger>{title || " "}</MenubarTrigger>
        <MenubarContent collisionPadding={8}>
          <MenubarLabel>World Settings</MenubarLabel>
          <MenubarGroup>
            <MenubarItem onSelect={() => setLastAction(action)}>{action || " "}<MenubarShortcut>Esc</MenubarShortcut></MenubarItem>
            <MenubarItem disabled>Unavailable</MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarCheckboxItem checked={coordinates} onCheckedChange={setCoordinates} onSelect={event => event.preventDefault()}>Show coordinates</MenubarCheckboxItem>
          <MenubarRadioGroup value={mode} onValueChange={setMode}>
            <MenubarRadioItem value="world" onSelect={event => event.preventDefault()}>World</MenubarRadioItem>
            <MenubarRadioItem value="game" onSelect={event => event.preventDefault()}>Game</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>More</MenubarSubTrigger>
            <MenubarPortal>
              <MenubarSubContent collisionPadding={8}>
                <MenubarItem onSelect={() => setLastAction("Video settings")}>Video settings</MenubarItem>
                <MenubarItem onSelect={() => setLastAction("Audio settings")}>Audio settings</MenubarItem>
              </MenubarSubContent>
            </MenubarPortal>
          </MenubarSub>
        </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="world">
          <MenubarTrigger>World</MenubarTrigger>
          <MenubarContent collisionPadding={8}>
            <MenubarItem onSelect={() => setLastAction("Create world")}>Create world</MenubarItem>
            <MenubarItem onSelect={() => setLastAction("Load world")}>Load world</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="unavailable">
          <MenubarTrigger disabled>Unavailable</MenubarTrigger>
          <MenubarContent><MenubarItem>Unavailable</MenubarItem></MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
    <div className="demo-result" aria-live="polite"><span className="status-dot" /><output aria-label="Menubar status">{lastAction}</output><span>{coordinates ? "Coordinates on" : "Coordinates off"} / {mode}</span></div>
  </>
}
