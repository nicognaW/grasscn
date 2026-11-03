import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Input } from "../registry/ui/input";
import { Label } from "../registry/ui/label";
import type { DemoProps } from "../types";

const LabelDemo = ({ scale }: DemoProps) => {
  const [text, setText] = React.useState("Player Name");

  return (
    <>
      <div className="demo-options">
        <Label htmlFor="preview-label-text" scale={scale}>
          Label text
        </Label>
        <Input
          id="preview-label-text"
          aria-label="Label text"
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${200 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          scale={scale}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </div>
      <div className="demo-stage" data-stage="label">
        <div className="demo-pair">
          <Label htmlFor="preview-label-input" scale={scale}>
            {text}
          </Label>
          <Input
            id="preview-label-input"
            scale={scale}
            defaultValue="New World"
          />
        </div>
        <div className="demo-pair">
          <Label htmlFor="preview-label-disabled" scale={scale}>
            Disabled field
          </Label>
          <Input
            id="preview-label-disabled"
            scale={scale}
            defaultValue="Unavailable"
            disabled
          />
        </div>
        <div className="demo-pair">
          <span>WRAPPED / CENTERED</span>
          <Label scale={scale} maxWidth={100} align="center">
            Create a new world with friends
          </Label>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <span>Click a label to focus its field</span>
      </div>
    </>
  );
};

export { LabelDemo as default };
