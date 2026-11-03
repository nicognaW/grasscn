import type { DemoVariables } from "../demo-variables";
import * as React from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../registry/ui/collapsible";
import { Input } from "../registry/ui/input";
import { Textarea } from "../registry/ui/textarea";
import { Button } from "../registry/ui/button";
import type { DemoProps } from "../types";

const CollapsibleDemo = ({ scale }: DemoProps) => {
  const [title, setTitle] = React.useState("World details");

  const [message, setMessage] = React.useState(
    "Hello Minecraft\nYour next adventure starts here."
  );

  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            scale={scale}
            aria-label="Collapsible title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className="w-(--demo-width) max-w-full"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${120 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
          />
        </label>
        <label>
          Message
          <Textarea
            scale={scale}
            aria-label="Collapsible message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            style={{ height: 50 * scale, maxWidth: "100%", width: 160 * scale }}
          />
        </label>
        <Button
          type="button"
          scale={scale}
          className="w-(--demo-width) max-w-full"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${120 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {open ? "Hide details" : "Show details"}
        </Button>
      </div>
      <div className="demo-stage" data-stage="collapsible">
        <Collapsible scale={scale} open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger>{title || " "}</CollapsibleTrigger>
          <CollapsibleContent>{message}</CollapsibleContent>
        </Collapsible>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />
        <output aria-label="Collapsible status">
          {open ? "Details open" : "Details closed"}
        </output>
        <span>World information</span>
      </div>
    </>
  );
};

export { CollapsibleDemo as default };
