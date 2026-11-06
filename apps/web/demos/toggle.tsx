import * as React from "react";

import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import { Label } from "../registry/ui/label";
import { Toggle } from "../registry/ui/toggle";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const ToggleDemo = ({ scale }: DemoProps) => {
  const { ref: stageRef, width: stageWidth } = useDemoWidth(scale);

  const [pressed, setPressed] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const [label, setLabel] = React.useState("Only craftable recipes");

  return (
    <>
      <div className="demo-options">
        <label>
          Filter label
          <Input
            aria-label="Toggle filter label"
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
            }}
            className="w-75"
          />
        </label>
        <Button
          onClick={() => {
            setDisabled((v) => !v);
          }}
        >
          {disabled ? "Enable filter" : "Disable filter"}
        </Button>
      </div>
      <div ref={stageRef} className="demo-stage" data-stage="toggle">
        <div className="demo-pair">
          <Label htmlFor="preview-toggle" scale={scale} maxWidth={stageWidth}>
            {label || " "}
          </Label>
          <Toggle
            id="preview-toggle"
            aria-label={label || "Recipe filter"}
            scale={scale}
            pressed={pressed}
            onPressedChange={setPressed}
            disabled={disabled}
          />
        </div>
        <div className="demo-pair">
          <span>LOCKED FILTER</span>
          <Toggle
            aria-label="Locked recipe filter"
            scale={scale}
            defaultPressed
            disabled
          />
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Recipe filter state">
          {pressed ? "Craftable recipes" : "All recipes"}
        </output>
        <span>Filter your results</span>
      </div>
    </>
  );
};

export { ToggleDemo as default };
