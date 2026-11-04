import * as React from "react";

import grass from "../assets/grass-block-48.png";
import type { DemoVariables } from "../demo-variables";
import { AspectRatio } from "../registry/ui/aspect-ratio";
import { Button } from "../registry/ui/button";
import type { DemoProps } from "../types";

const isAssetUrl = (asset: unknown): asset is string =>
  typeof asset === "string";

const AspectRatioDemo = ({ scale }: DemoProps) => {
  const [ratio, setRatio] = React.useState(16 / 9);

  const demoLayout1: DemoVariables = {
    "--demo-owned-aspect-ratio-1-width": `${Math.min(320, 160 * scale)}px`,
  };

  return (
    <>
      <div className="demo-options">
        {[
          ["1:1", 1],
          ["4:3", 4 / 3],
          ["16:9", 16 / 9],
        ].map(([label, value]) => (
          <Button
            key={String(label)}
            type="button"
            scale={scale}
            className="w-(--demo-width)"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${70 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
            aria-pressed={ratio === value}
            onClick={() => {
              setRatio(Number(value));
            }}
          >
            {String(label)}
          </Button>
        ))}
      </div>
      <div className="demo-stage" data-stage="aspect-ratio">
        <div
          className="demo-owned-aspect-ratio-1 max-w-full"
          style={demoLayout1}
        >
          <AspectRatio ratio={ratio} className="demo-owned-aspect-ratio-2">
            <img
              src={isAssetUrl(grass) ? grass : grass.src}
              alt="Grass block"
              width="48"
              height="48"
              className="demo-layout-demos-aspect-ratio-2"
            />
          </AspectRatio>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Aspect ratio">
          {ratio === 1 ? "1:1" : ratio === 4 / 3 ? "4:3" : "16:9"}
        </output>
        <span>Resize content while preserving its proportions.</span>
      </div>
    </>
  );
};

export { AspectRatioDemo as default };
