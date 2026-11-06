import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import { MinecraftText } from "../registry/ui/minecraft-text";
import type { DemoProps } from "../types";

const ButtonDemo = ({ scale }: DemoProps) => {
  const [label, setLabel] = React.useState("Button");
  const [width, setWidth] = React.useState(200);
  const [count, setCount] = React.useState(0);

  const demoLayout1: DemoVariables = {
    "--demo-owned-button-1-width": `${width * scale}px`,
  };

  const demoLayout2: DemoVariables = {
    "--demo-owned-button-2-width": `${width * scale}px`,
  };

  return (
    <>
      <div className="demo-options">
        <label>
          <MinecraftText>Label</MinecraftText>
          <Input
            aria-label="Button label"
            value={label}
            maxLength={24}
            onChange={(event) => {
              setLabel(event.target.value);
            }}
          />
        </label>
        <Button
          aria-label={`Button width: ${width} px`}
          onClick={() => {
            const widths = [103, 150, 200, 257];
            setWidth(widths[(widths.indexOf(width) + 1) % widths.length]);
          }}
        >{`Width: ${width} px`}</Button>
      </div>
      <div className="demo-stage" data-stage="button">
        <div className="demo-pair">
          <span>
            <MinecraftText>INTERACTIVE</MinecraftText>
          </span>
          <Button
            scale={scale}
            className="demo-owned-button-1"
            style={demoLayout1}
            onClick={() => {
              setCount((value) => value + 1);
            }}
          >
            {label || " "}
          </Button>
        </div>
        <div className="demo-pair">
          <span>
            <MinecraftText>DISABLED</MinecraftText>
          </span>
          <Button
            scale={scale}
            className="demo-owned-button-2"
            style={demoLayout2}
            disabled
          >
            {label || " "}
          </Button>
        </div>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />{" "}
        <output aria-label="Button activations">
          <MinecraftText>
            {count === 0
              ? "Ready to click"
              : `Pressed ${count} ${count === 1 ? "time" : "times"}`}
          </MinecraftText>
        </output>
        <span>
          <MinecraftText>Vanilla button</MinecraftText>
        </span>
      </div>
    </>
  );
};

export { ButtonDemo as default };
