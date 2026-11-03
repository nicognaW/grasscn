import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import { MinecraftDisclosureText } from "../registry/ui/minecraft-disclosure-text";
import {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceDescription,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
} from "../registry/ui/trace";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const TraceDemo = ({ scale }: DemoProps) => {
  const stage = useDemoWidth(scale);

  const [status, setStatus] = React.useState<"running" | "error" | "pending">(
    "running"
  );

  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="demo-options">
        <Button
          scale={scale}
          className="w-(--demo-width) max-w-full"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${110 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setStatus((value) =>
              value === "running"
                ? "error"
                : value === "error"
                  ? "pending"
                  : "running"
            );
          }}
        >
          Change status
        </Button>
      </div>
      <div ref={stage.ref} className="demo-stage" data-stage="trace">
        <Trace scale={scale} style={{ width: "100%" }}>
          <TraceLine status={status}>
            <TraceIcon>O</TraceIcon>
            <TraceTitle>
              <MinecraftDisclosureText
                scale={scale}
                maxWidth={Math.max(1, Math.min(100, stage.width - 30))}
              >
                Building terrain 世界
              </MinecraftDisclosureText>
            </TraceTitle>
            <TraceDescription>1.2s</TraceDescription>
          </TraceLine>
          <TraceLine status="pending">
            <TraceTitle>Waiting for chunks</TraceTitle>
          </TraceLine>
          <TraceCollapsible open={open} onOpenChange={setOpen}>
            <TraceCollapsibleTrigger style={{ width: "100%" }}>
              Details
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
              {"Placed 64 blocks.\n你好，世界"}
            </TraceCollapsibleContent>
          </TraceCollapsible>
        </Trace>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Trace status">{status}</output>
        <span>Expand the details to inspect the trace</span>
      </div>
    </>
  );
};

export { TraceDemo as default };
