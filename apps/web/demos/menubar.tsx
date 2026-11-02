import * as React from "react";
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarGroup, MenubarLabel, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubTrigger, MenubarPortal, MenubarSubContent, } from "../registry/ui/menubar";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

export default function MenubarDemo({ scale }: DemoProps) {
  const [title, setTitle] = React.useState("Game");
  const [action, setAction] = React.useState("Resume game");
  const [coordinates, setCoordinates] = React.useState(false);
  const [mode, setMode] = React.useState("world");
  const [lastAction, setLastAction] = React.useState("Choose a world option");

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Menubar title"
            value={title}
            onChange={(event) => { setTitle(event.target.value); }}
            className="w-60"
          />
        </label>
        <label>
          Action
          <Input
            aria-label="Menubar action"
            value={action}
            onChange={(event) => { setAction(event.target.value); }}
            className="w-60"
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="menubar">
        <Menubar scale={scale} aria-label="World command bar">
          <MenubarMenu>
            <MenubarTrigger>{title || " "}</MenubarTrigger>
            <MenubarContent collisionPadding={8}>
              <MenubarGroup>
                <MenubarLabel>World Settings</MenubarLabel>
                <MenubarItem onClick={() => { setLastAction(action); }}>
                  {action || " "}
                  <MenubarShortcut>Esc</MenubarShortcut>
                </MenubarItem>
                <MenubarItem disabled>Unavailable</MenubarItem>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarCheckboxItem
                checked={coordinates}
                onCheckedChange={setCoordinates}
                onClick={(event) => event.preventDefault()}
                closeOnClick={false}
              >
                Show coordinates
              </MenubarCheckboxItem>
              <MenubarRadioGroup value={mode} onValueChange={setMode}>
                <MenubarRadioItem
                  value="world"
                  onClick={(event) => event.preventDefault()}
                  closeOnClick={false}
                >
                  World
                </MenubarRadioItem>
                <MenubarRadioItem
                  value="game"
                  onClick={(event) => event.preventDefault()}
                  closeOnClick={false}
                >
                  Game
                </MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>More</MenubarSubTrigger>
                <MenubarPortal>
                  <MenubarSubContent collisionPadding={8}>
                    <MenubarItem
                      onClick={() => { setLastAction("Video settings"); }}
                    >
                      Video settings
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => { setLastAction("Audio settings"); }}
                    >
                      Audio settings
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarPortal>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>World</MenubarTrigger>
            <MenubarContent collisionPadding={8}>
              <MenubarItem onClick={() => { setLastAction("Create world"); }}>
                Create world
              </MenubarItem>
              <MenubarItem onClick={() => { setLastAction("Load world"); }}>
                Load world
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger disabled>Unavailable</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Unavailable</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />
        <output aria-label="Menubar status">{lastAction}</output>
        <span>
          {coordinates ? "Coordinates on" : "Coordinates off"} / {mode}
        </span>
      </div>
    </>
  );
}
