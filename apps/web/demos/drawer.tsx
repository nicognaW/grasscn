import * as React from "react";

import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "../registry/ui/drawer";
import { Input } from "../registry/ui/input";
import { Textarea } from "../registry/ui/textarea";
import type { DemoProps } from "../types";

export default function DrawerDemo({ scale }: DemoProps) {
  const [title, setTitle] = React.useState("World settings"),
    [message, setMessage] = React.useState("Hello Minecraft\n你好，世界");

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Drawer title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            className="w-70"
          />
        </label>
        <label>
          Message
          <Textarea
            aria-label="Drawer message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            style={{ width: 320, height: 100 }}
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="drawer">
        <Drawer scale={scale}>
          <DrawerTrigger>Open drawer</DrawerTrigger>
          <DrawerContent showCloseButton={false}>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{message}</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose>Done</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
