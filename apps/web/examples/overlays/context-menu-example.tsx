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

const Example = () => {
  const [coordinates, setCoordinates] = useState(false);
  const [action, setAction] = useState("Choose an action");

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger
          /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
          style={{ border: "2px solid #a0a0a0", display: "block", padding: 24 }}
          /* eslint-enable shadcn/no-inline-styles */
        >
          Right-click for world actions
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              setAction("Resumed");
            }}
          >
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
};

export default Example;
