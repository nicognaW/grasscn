import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import {
  Progress,
  type BossBarColor,
  type BossBarOverlay,
} from "../registry/ui/progress";
import { Slider } from "../registry/ui/slider";
import type { DemoProps } from "../types";

const colors: BossBarColor[] = [
  "pink",
  "blue",
  "red",
  "green",
  "yellow",
  "purple",
  "white",
];

const overlays: BossBarOverlay[] = [
  "progress",
  "notched_6",
  "notched_10",
  "notched_12",
  "notched_20",
];

const ProgressDemo = ({ scale }: DemoProps) => {
  const [value, setValue] = React.useState(50);
  const [color, setColor] = React.useState<BossBarColor>("pink");
  const [overlay, setOverlay] = React.useState<BossBarOverlay>("progress");
  const colorName = color[0].toUpperCase() + color.slice(1);
  const notchName = overlay === "progress" ? "None" : overlay.slice(8);

  return (
    <>
      <div className="demo-options">
        <Button
          aria-label={`Boss bar color: ${colorName}`}
          onClick={() => {
            setColor(colors[(colors.indexOf(color) + 1) % colors.length]);
          }}
        >{`Color: ${colorName}`}</Button>
        <Button
          aria-label={`Boss bar notches: ${notchName}`}
          onClick={() => {
            setOverlay(
              overlays[(overlays.indexOf(overlay) + 1) % overlays.length]
            );
          }}
        >{`Notches: ${notchName}`}</Button>
      </div>
      <div className="demo-stage" data-stage="progress">
        <div className="demo-pair">
          <span>BOSS BAR</span>
          <Progress
            aria-label="Demo progress"
            scale={scale}
            color={color}
            overlay={overlay}
            value={value}
          />
        </div>
        <Slider
          aria-label="Set progress"
          scale={scale}
          label={`Progress: ${value}%`}
          value={[value]}
          onValueChange={(next) =>
            { 
            setValue(typeof next === "number" ? next : next[0]); }
          }
          min={0}
          max={100}
          step={1}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${182 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        />
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Progress percentage">{value}%</output>
        <span>Try different colors and segments</span>
      </div>
    </>
  );
};

export { ProgressDemo as default };
