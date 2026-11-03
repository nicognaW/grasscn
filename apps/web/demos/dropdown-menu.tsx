import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "../registry/ui/dropdown-menu";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

const DropdownMenuDemo = ({ scale }: DemoProps) => {
  const [title, setTitle] = React.useState("World Settings");
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
            aria-label="Dropdown menu title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className="w-60"
          />
        </label>
        <label>
          Action
          <Input
            aria-label="Dropdown menu action"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
            }}
            className="w-60"
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="dropdown-menu">
        <DropdownMenu scale={scale}>
          <DropdownMenuTrigger>Game menu</DropdownMenuTrigger>
          <DropdownMenuContent collisionPadding={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{title || " "}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setLastAction(action);
                }}
              >
                {action || " "}
                <DropdownMenuShortcut>Esc</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Unavailable</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={coordinates}
              onCheckedChange={setCoordinates}
              onClick={(event) => {
event.preventDefault();
}}
              closeOnClick={false}
            >
              Show coordinates
            </DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value={mode} onValueChange={setMode}>
              <DropdownMenuRadioItem
                value="world"
                onClick={(event) => {
event.preventDefault();
}}
                closeOnClick={false}
              >
                World
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="game"
                onClick={(event) => {
event.preventDefault();
}}
                closeOnClick={false}
              >
                Game
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent collisionPadding={8}>
                  <DropdownMenuItem
                    onClick={() => {
                      setLastAction("Video settings");
                    }}
                  >
                    Video settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setLastAction("Audio settings");
                    }}
                  >
                    Audio settings
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />
        <output aria-label="Dropdown menu status">{lastAction}</output>
        <span>
          {coordinates ? "Coordinates on" : "Coordinates off"} / {mode}
        </span>
      </div>
    </>
  );
};

export { DropdownMenuDemo as default };
