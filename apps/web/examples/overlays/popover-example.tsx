"use client";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";

export default function Example() {
  return (
    <Popover>
      <PopoverTrigger>World options</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>World settings</PopoverTitle>
          <PopoverDescription>Configure your world.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
