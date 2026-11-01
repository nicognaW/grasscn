"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";

export default function Example() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  return <div>
    <Button onClick={() => setOpen(true)}>Open command palette</Button>
    <CommandDialog open={open} onOpenChange={setOpen} title="World commands" description="Choose a command to run.">
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandItem value="save" onSelect={value => { setValue(value); setOpen(false); }}>Save world</CommandItem>
        <CommandItem value="explore" onSelect={value => { setValue(value); setOpen(false); }}>Explore world</CommandItem>
        <CommandEmpty>No commands found.</CommandEmpty>
      </CommandList>
    </CommandDialog>
    <output aria-label="Palette selection">{value || "Choose a command"}</output>
  </div>;
}
