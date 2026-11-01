"use client";

import { useState } from "react";

import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

export default function Example() {
  const [value, setValue] = useState("");
  return (
    <div>
      <Command label="World commands">
        <CommandInput placeholder="Search commands..." />
        <CommandList>
          <CommandGroup heading="World">
            <CommandItem
              value="survival"
              keywords={["生存"]}
              onSelect={setValue}
            >
              Survival
            </CommandItem>
            <CommandItem value="creative" onSelect={setValue}>
              Creative
            </CommandItem>
          </CommandGroup>
          <CommandEmpty>No commands found.</CommandEmpty>
        </CommandList>
      </Command>
      <output aria-label="Selected command">
        {value || "Choose a command"}
      </output>
    </div>
  );
}
