import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
} from "../registry/ui/button-group";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const ButtonGroupDemo = ({ scale }: DemoProps) => {
  const { ref: stageRef, width: stageWidth } = useDemoWidth(scale);

  const buttonWidth = Math.min(
    100,
    Math.max(40, Math.floor((stageWidth - 6) / 2))
  );

  const [orientation, setOrientation] = React.useState<
    "horizontal" | "vertical"
  >("horizontal");

  const [title, setTitle] = React.useState("World actions");
  const [action, setAction] = React.useState("Ready");

  const demoLayout2: DemoVariables = {
    "--demo-owned-button-group-2-width": `${buttonWidth * scale}px`,
  };

  const demoLayout3: DemoVariables = {
    "--demo-owned-button-group-3-width": `${buttonWidth * scale}px`,
  };

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Button group title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            className="w-60"
          />
        </label>
        <Button
          scale={scale}
          type="button"
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${120 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setOrientation((v) =>
              v === "horizontal" ? "vertical" : "horizontal"
            );
          }}
        >
          Change layout
        </Button>
      </div>
      <div ref={stageRef} className="demo-stage" data-stage="button-group">
        <ButtonGroup
          scale={scale}
          orientation={orientation}
          aria-label="World actions"
          className="demo-owned-button-group-1"
        >
          <ButtonGroupText
            scale={scale}
            maxWidth={stageWidth}
            className={
              orientation === "horizontal" && stageWidth < 300
                ? "basis-full"
                : undefined
            }
          >
            {title}
          </ButtonGroupText>
          <Button
            scale={scale}
            type="button"
            className="demo-owned-button-group-2"
            style={demoLayout2}
            onClick={() => {
              setAction("World created");
            }}
          >
            Create
          </Button>
          <ButtonGroupSeparator
            scale={scale}
            orientation={
              orientation === "horizontal" ? "vertical" : "horizontal"
            }
          />
          <Button
            scale={scale}
            type="button"
            className="demo-owned-button-group-3"
            style={demoLayout3}
            onClick={() => {
              setAction("World loaded");
            }}
          >
            Load
          </Button>
        </ButtonGroup>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Button group action">{action}</output>
        <span>{orientation} grouping</span>
      </div>
    </>
  );
};

export { ButtonGroupDemo as default };
