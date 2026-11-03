import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../registry/ui/card";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuPortal,
  ContextMenuSubContent,
} from "../registry/ui/context-menu";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-demos-context-menu-1-min-height": `${number}px`;
  "--mc-intrinsic-demos-context-menu-1-width": `${number}px`;
}

const ContextMenuDemo = ({ scale }: DemoProps) => {
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
            aria-label="Context menu title"
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
            aria-label="Context menu action"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
            }}
            className="w-60"
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="context-menu">
        <ContextMenu scale={scale}>
          <ContextMenuTrigger
            render={
              <Card
                scale={scale}
                tabIndex={0}
                aria-label="World context menu target"
                className="min-h-(--mc-intrinsic-demos-context-menu-1-min-height) w-(--mc-intrinsic-demos-context-menu-1-width) max-w-full"
                style={
                  // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                  {
                    "--mc-intrinsic-demos-context-menu-1-min-height": `${80 * scale}px`,
                    "--mc-intrinsic-demos-context-menu-1-width": `${200 * scale}px`,
                  } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
                }
              />
            }
          >
            {
              <>
                <CardHeader>
                  <CardTitle>{title || " "}</CardTitle>
                  <CardDescription>
                    Right click or touch and hold.
                  </CardDescription>
                </CardHeader>
              </>
            }
          </ContextMenuTrigger>
          <ContextMenuContent collisionPadding={8}>
            <ContextMenuGroup>
              <ContextMenuLabel>{title || " "}</ContextMenuLabel>
              <ContextMenuItem
                onClick={() => {
                  setLastAction(action);
                }}
              >
                {action || " "}
                <ContextMenuShortcut>Esc</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem disabled>Unavailable</ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem
              checked={coordinates}
              onCheckedChange={setCoordinates}
              onClick={(event) => {
event.preventDefault();
}}
              closeOnClick={false}
            >
              Show coordinates
            </ContextMenuCheckboxItem>
            <ContextMenuRadioGroup value={mode} onValueChange={setMode}>
              <ContextMenuRadioItem
                value="world"
                onClick={(event) => {
event.preventDefault();
}}
                closeOnClick={false}
              >
                World
              </ContextMenuRadioItem>
              <ContextMenuRadioItem
                value="game"
                onClick={(event) => {
event.preventDefault();
}}
                closeOnClick={false}
              >
                Game
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent collisionPadding={8}>
                  <ContextMenuItem
                    onClick={() => {
                      setLastAction("Video settings");
                    }}
                  >
                    Video settings
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      setLastAction("Audio settings");
                    }}
                  >
                    Audio settings
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />
        <output aria-label="Context menu status">{lastAction}</output>
        <span>
          {coordinates ? "Coordinates on" : "Coordinates off"} / {mode}
        </span>
      </div>
    </>
  );
};

export { ContextMenuDemo as default };
