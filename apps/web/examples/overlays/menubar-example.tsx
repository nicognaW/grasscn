"use client";

import { useState } from "react";

import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
} from "@/components/ui/menubar";

export default function Example() {
  const [action, setAction] = useState("Choose a command");
  return (
    <div>
      <Menubar aria-label="World command bar">
        <MenubarMenu>
          <MenubarTrigger>Game</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setAction("Resumed")}>
              Resume game
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>World</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setAction("Created")}>
              Create world
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <output aria-label="Menu action">{action}</output>
    </div>
  );
}
