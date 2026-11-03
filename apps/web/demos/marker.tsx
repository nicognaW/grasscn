import * as React from "react";

import { Marker, MarkerContent, MarkerIcon } from "../registry/ui/marker";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--demo-stage-gap": `${number}px`;
}

const Demo = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => (
  <div
    className="demo-stage demo-layout-demos-marker-1 demo-stage-display-grid"
    data-stage="marker"
    style={
      // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
      {
        "--demo-stage-gap": `${8 * scale}px`,
      } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
    }
  >
    <Marker scale={scale}>
      <MarkerIcon>!</MarkerIcon>
      <MarkerContent>World saved 世界</MarkerContent>
    </Marker>
    <Marker scale={scale} variant="separator">
      <MarkerContent>Checkpoint reached</MarkerContent>
    </Marker>
    <Marker scale={scale} variant="border">
      <MarkerContent>
        <a href="#marker">Return to this marker</a>
      </MarkerContent>
    </Marker>
  </div>
);

export { Demo as default };
