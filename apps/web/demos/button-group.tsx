import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import {ButtonGroup,ButtonGroupText,ButtonGroupSeparator} from "../registry/ui/button-group"
import {Button} from "../registry/ui/button"
import {Input} from "../registry/ui/input"
import {useDemoWidth} from "../use-demo-width"
import type {DemoProps} from "../types"

const ButtonGroupDemo = ({ scale }: DemoProps) => {
  const stage = useDemoWidth(scale);

  const buttonWidth = Math.min(
    100,
    Math.max(40, Math.floor((stage.width - 6) / 2))
  );

  const [orientation, setOrientation] = React.useState<
    "horizontal" | "vertical"
  >("horizontal");

  const [title, setTitle] = React.useState("World actions");
  const [action, setAction] = React.useState("Ready");

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
      <div ref={stage.ref} className="demo-stage" data-stage="button-group">
        <ButtonGroup
          scale={scale}
          orientation={orientation}
          aria-label="World actions"
          style={{ maxWidth: "100%", flexWrap: "wrap" }}
        >
          <ButtonGroupText
            scale={scale}
            maxWidth={stage.width}
            style={
              orientation === "horizontal" && stage.width < 300
                ? { flexBasis: "100%" }
                : undefined
            }
          >
            {title}
          </ButtonGroupText>
          <Button
            scale={scale}
            type="button"
            style={{ width: buttonWidth * scale }}
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
            style={{ width: buttonWidth * scale }}
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
