"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const Example = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger render={<Button scale={2} />}>
        Inspect pickaxe
      </TooltipTrigger>
      <TooltipContent scale={2}>
        {"Diamond Pickaxe\nA helpful description."}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default Example;
