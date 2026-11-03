import { Button } from "../registry/ui/button";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "../registry/ui/tooltip";
import type { DemoProps } from "../types";

const TooltipDemo = ({ scale }: DemoProps) => (
  <TooltipProvider>
    <div className="demo-stage" data-stage="tooltip">
      <div className="demo-pair">
        <span>ITEM INFORMATION</span>
        <Tooltip>
          <TooltipTrigger
            render={<Button scale={scale} aria-label="Inspect tooltip" />}
          >
            {"Hover or focus"}
          </TooltipTrigger>
          <TooltipContent scale={scale}>Minecraft Tooltip</TooltipContent>
        </Tooltip>
      </div>
      <div className="demo-pair">
        <span>MULTILINE</span>
        <Tooltip>
          <TooltipTrigger render={<Button scale={scale} />}>
            {"More information"}
          </TooltipTrigger>
          <TooltipContent scale={scale}>
            {"Diamond Pickaxe\nA helpful description."}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
    <div className="demo-result">
      <span />
      <span>Hover or use your keyboard</span>
      <span>Escape to dismiss</span>
    </div>
  </TooltipProvider>
);

export { TooltipDemo as default };
