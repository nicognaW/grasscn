"use client";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";

const Example = () => (
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

export default Example;
