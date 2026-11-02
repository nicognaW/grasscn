import type { DemoVariables } from "../demo-variables";
import * as React from "react";

import grass from "../assets/grass-block-48.png";
import { AspectRatio } from "../registry/ui/aspect-ratio";
import { Button } from "../registry/ui/button";
import type { DemoProps } from "../types";
const isAssetUrl = (asset: unknown): asset is string =>
  typeof asset === "string";

export default function AspectRatioDemo({ scale }: DemoProps) {
  const [ratio, setRatio] = React.useState(16 / 9);
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
            className="w-(--demo-width)" style={({"--demo-width": `${70 * scale}px`} satisfies DemoVariables) as DemoVariables}
            aria-pressed={ratio === value}
            onClick={() => setRatio(Number(value))}
          >
            {String(label)}
          </Button>
        ))}
      </div>
      <div className="demo-stage" data-stage="aspect-ratio">
        <div style={{ width: Math.min(320, 160 * scale), maxWidth: "100%" }}>
          <AspectRatio
            ratio={ratio}
            style={{
              background: "#383838",
              border: "2px solid #a0a0a0",
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
            }}
          >
            <img
              src={isAssetUrl(grass) ? grass : grass.src}
              alt="Grass block"
              width="48"
              height="48"
              style={{ imageRendering: "pixelated" }}
            />
          </AspectRatio>
        </div>
      </div>
      <div className="demo-result">
        <span className="status-dot" />
        <output aria-label="Aspect ratio">
          {ratio === 1 ? "1:1" : ratio === 4 / 3 ? "4:3" : "16:9"}
        </output>
        <span>Resize content while preserving its proportions.</span>
      </div>
    </>
  );
}
