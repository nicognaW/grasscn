"use client";

import { useState } from "react";

import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

export default function Example() {
  const [coordinates, setCoordinates] = useState(false);
  const [action, setAction] = useState("Choose an action");
  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger
          style={{ display: "block", padding: 24, border: "2px solid #a0a0a0" }}
        >
          Right-click for world actions
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setAction("Resumed")}>
            Resume game
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem
            checked={coordinates}
            onCheckedChange={setCoordinates}
            closeOnClick={false}
          >
            Show coordinates
          </ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>
      <output aria-label="World action">
        {action} / {coordinates ? "Coordinates on" : "Coordinates off"}
      </output>
    </div>
  );
}
