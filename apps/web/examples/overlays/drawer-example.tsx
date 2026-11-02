"use client";

import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

const Example = () => (
  <Drawer>
    <DrawerTrigger>Open drawer</DrawerTrigger>
    <DrawerContent showCloseButton={false}>
      <DrawerHeader>
        <DrawerTitle>World settings</DrawerTitle>
        <DrawerDescription>Keep building your adventure.</DrawerDescription>
      </DrawerHeader>
      <DrawerFooter>
        <DrawerClose>Done</DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);

export default Example;
