import * as React from "react";

import { Marker, MarkerContent, MarkerIcon } from "../registry/ui/marker";
export default function Demo({ scale = 2 }: { scale?: 1 | 2 | 3 }) {
  return (
    <div
      className="demo-stage"
      data-stage="marker"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        gap: 8 * scale,
      }}
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
}
