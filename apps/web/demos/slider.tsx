import * as React from "react";

import { Slider } from "../registry/ui/slider";
import { getPreviewSoundVolume, setPreviewSoundVolume } from "../sound";
import type { DemoProps } from "../types";

const SliderDemo = ({ scale }: DemoProps) => {
  const [value, setValue] = React.useState(() => [getPreviewSoundVolume()]);

  return (
    <>
      <div className="demo-stage slider-stage" data-stage="slider">
        <div className="demo-pair">
          <span className="sample-caption">INTERACTIVE</span>
          <Slider
            scale={scale}
            value={value}
            onValueChange={(next) => {
              setPreviewSoundVolume(typeof next === "number" ? next : next[0]);
              setValue(typeof next === "number" ? [next] : [...next]);
            }}
            aria-label="Volume"
            label={`Volume: ${value[0]}%`}
          />
        </div>
        <div className="demo-pair">
          <span className="sample-caption">DISABLED</span>
          <Slider
            scale={scale}
            value={[50]}
            aria-label="Disabled volume"
            label="Volume: 50%"
            disabled
          />
        </div>
      </div>
      <div className="demo-result" aria-live="polite">
        <span className="status-dot" />
        <output aria-label="Slider value">{value[0]}%</output>
        <span>Interaction sound volume</span>
      </div>
    </>
  );
};

export { SliderDemo as default };
