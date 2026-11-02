import type { DemoVariables } from "../demo-variables";
import * as React from 'react';
import { HealthMeter, ArmorMeter, HungerMeter, AirMeter, ExperienceBar } from '../registry/ui/hud';
import { Button } from '../registry/ui/button';
import type { DemoProps } from '../types';

export default function HudDemo({ scale }: DemoProps) {
  const [health, setHealth] = React.useState(17),
    [progress, setProgress] = React.useState(0.45);

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-20"
      data-stage="hud"
    >
      <div className="grid gap-3">
        <p>Player status</p>
        <HealthMeter value={health} scale={scale} />
        <ArmorMeter value={14} scale={scale} />
        <HungerMeter value={18} scale={scale} />
        <AirMeter value={7} scale={scale} />
      </div>
      <div className="grid gap-2.5">
        <p>Journey to the next level</p>
        <ExperienceBar value={progress} scale={scale} />
      </div>
      <div className="flex gap-3 flex-wrap">
        <Button
          scale={scale}
          onClick={() => setHealth((v) => Math.max(0, v - 3))}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${100 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          Take damage
        </Button>
        <Button
          scale={scale}
          onClick={() => setHealth(20)}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${80 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          Heal
        </Button>
        <Button
          scale={scale}
          onClick={() =>
            setProgress((v) => ((Math.round(v * 100) + 15) % 101) / 100)
          }
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${100 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          Gain XP
        </Button>
      </div>
    </div>
  );
}
