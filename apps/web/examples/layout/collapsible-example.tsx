"use client";

import { useState } from "react";

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export default function CollapsibleExample() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger>World details</CollapsibleTrigger>
      <CollapsibleContent maxWidth={200}>
        Survival world with structures enabled.
      </CollapsibleContent>
    </Collapsible>
  );
}
