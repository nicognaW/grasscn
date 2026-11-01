"use client";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

const Example = () => (
  <Sheet>
    <SheetTrigger>Open sheet</SheetTrigger>
    <SheetContent showCloseButton={false}>
      <SheetHeader>
        <SheetTitle>World settings</SheetTitle>
        <SheetDescription>Keep building your adventure.</SheetDescription>
      </SheetHeader>
      <SheetFooter>
        <SheetClose>Done</SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

export default Example;
