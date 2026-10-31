import { Button } from "../../registry/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../../registry/ui/tooltip"
import type { DemoProps } from "../types"

export default function TooltipDemo({ scale }: DemoProps) {
  return <TooltipProvider>
    <div className="demo-stage" data-stage="tooltip">
      <div className="demo-pair"><span className="sample-caption">ITEM INFORMATION</span>
        <Tooltip><TooltipTrigger asChild><Button scale={scale} aria-label="Inspect tooltip">Hover or focus</Button></TooltipTrigger>
          <TooltipContent scale={scale}>Minecraft Tooltip</TooltipContent></Tooltip>
      </div>
      <div className="demo-pair"><span className="sample-caption">MULTILINE</span>
        <Tooltip><TooltipTrigger asChild><Button scale={scale}>More information</Button></TooltipTrigger>
          <TooltipContent scale={scale}>{"Diamond Pickaxe\nA helpful description."}</TooltipContent></Tooltip>
      </div>
    </div>
    <div className="demo-result"><span className="status-dot" /><span>Hover or use your keyboard</span><span>Escape to dismiss</span></div>
  </TooltipProvider>
}
