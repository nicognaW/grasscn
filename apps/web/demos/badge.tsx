import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Badge } from "../registry/ui/badge";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

const BadgeDemo = ({ scale }: DemoProps) => {
  const [text, setText] = React.useState("Diamonds!");
  const [earned, setEarned] = React.useState(true);
  const [clicks, setClicks] = React.useState(0);

  return (
    <>
      <div className="demo-options">
        <label>
          Advancement title
          <Input
            aria-label="Badge text"
            scale={scale}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            className="w-(--demo-width) max-w-full"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${140 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
          />
        </label>
        <Button
          scale={scale}
          onClick={() => {
            setEarned((value) => !value);
          }}
          className="w-(--demo-width) max-w-full"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${130 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          {earned ? "Reset challenge" : "Earn challenge"}
        </Button>
      </div>
      <div
        className="demo-stage demo-stage-display-flex demo-stage-align-items-flex-start flex-col"
        data-stage="badge"
        style={
          /* SAFETY: satisfies checks --demo-stage-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-stage-gap": `${12 * scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <div className="demo-pair demo-pair-max-width-full">
          <span>CHALLENGE</span>
          <Badge scale={scale} earned={earned}>
            {text}
          </Badge>
        </div>
        <div className="demo-pair demo-pair-max-width-full">
          <span>TASK</span>
          <Badge scale={scale} achievement="task">
            New recipe
          </Badge>
        </div>
        <div className="demo-pair demo-pair-max-width-full">
          <span>GOAL / LINK</span>
          <Badge
            render={
              // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- Badge supplies the fixed View recipes text to this anchor through its supported render seam.
              <a
                href="#badge"
                onClick={() => {
                  setClicks((v) => v + 1);
                }}
              />
            }
            scale={scale}
            achievement="goal"
          >
            View recipes
          </Badge>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Badge achievement state">
          {earned ? "Challenge complete!" : "Challenge not yet earned"}
        </output>
        <output aria-label="Badge link activations">
          Opened {clicks} times
        </output>
      </div>
    </>
  );
};

export { BadgeDemo as default };
