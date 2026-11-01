"use client";

import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Example = () => {
  const [coordinates, setCoordinates] = useState(false);
  const [action, setAction] = useState("Choose an action");

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger>Game menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => {
              setAction("Resumed");
            }}
          >
            Resume game
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={coordinates}
            onCheckedChange={setCoordinates}
            closeOnClick={false}
          >
            Show coordinates
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <output aria-label="World action">
        {action} / {coordinates ? "Coordinates on" : "Coordinates off"}
      </output>
    </div>
  );
};

export default Example;
