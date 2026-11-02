import type { DemoVariables } from "../demo-variables";
import * as React from "react";
import { Badge } from "../registry/ui/badge";
import { Input } from "../registry/ui/input";
import { Button } from "../registry/ui/button";
import type { DemoProps } from "../types";
export default function BadgeDemo({ scale }: DemoProps) {
  const [text, setText] = React.useState("Diamonds!"),
    [earned, setEarned] = React.useState(true),
    [clicks, setClicks] = React.useState(0);
  return (
    <>
      <div className="demo-options">
        <label className="demo-option">
          Advancement title
          <Input
            aria-label="Badge text"
            scale={scale}
            value={text}
            onChange={(event) => setText(event.target.value)}
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
          onClick={() => setEarned((value) => !value)}
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
        className="demo-stage demo-stage-display-flex flex-col demo-stage-align-items-flex-start"
        data-stage="badge"
        style={
          /* SAFETY: satisfies checks --demo-stage-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-stage-gap": `${12 * scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <div className="demo-pair demo-pair-max-width-full">
          <span className="sample-caption">CHALLENGE</span>
          <Badge scale={scale} earned={earned}>
            {text}
          </Badge>
        </div>
        <div className="demo-pair demo-pair-max-width-full">
          <span className="sample-caption">TASK</span>
          <Badge scale={scale} achievement="task">
            New recipe
          </Badge>
        </div>
        <div className="demo-pair demo-pair-max-width-full">
          <span className="sample-caption">GOAL / LINK</span>
          <Badge
            render={<a href="#badge" onClick={() => setClicks((v) => v + 1)} />}
            scale={scale}
            achievement="goal"
          >
            {"View recipes"}
          </Badge>
        </div>
      </div>
      <div className="demo-result">
        <span className="status-dot" />
        <output aria-label="Badge achievement state">
          {earned ? "Challenge complete!" : "Challenge not yet earned"}
        </output>
        <output aria-label="Badge link activations">
          Opened {clicks} times
        </output>
      </div>
    </>
  );
}
