import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../registry/ui/collapsible";
import { Input } from "../registry/ui/input";
import { Textarea } from "../registry/ui/textarea";
import type { DemoProps } from "../types";

interface PresentationLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-presentation-demos-collapsible-1-height": `${number}px`;
  "--mc-presentation-demos-collapsible-1-width": `${number}px`;
}

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
            className="h-(--mc-presentation-demos-collapsible-1-height) w-(--mc-presentation-demos-collapsible-1-width) max-w-full"
            style={
              // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
              {
                "--mc-presentation-demos-collapsible-1-height": `${50 * scale}px`,
                "--mc-presentation-demos-collapsible-1-width": `${160 * scale}px`,
              } satisfies PresentationLayoutStyle1 as PresentationLayoutStyle1
            }
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
