import * as React from "react";

import { Button } from "../registry/ui/button";
import { MinecraftMap, LocatorBar } from "../registry/ui/map";
import type { DemoProps } from "../types";
import { getWorldMapPixels } from "./map-world-data";

const MapDemo = ({ scale }: DemoProps) => {
  const [heading, setHeading] = React.useState(0);
  const [selected, setSelected] = React.useState("Home");
  const [point, setPoint] = React.useState<{ x: number; y: number }>();

  const pixels = React.useMemo(() => getWorldMapPixels(), []);

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-20 max-w-full"
      data-stage="map"
    >
      <div className="demo-layout-demos-map-1">
        <MinecraftMap
          scale={scale}
          pixels={pixels}
          aria-label="Regional map"
          markers={[
            {
              decoration: "frame",
              id: "Home",
              label: "Home",
              rotation: 0,
              x: -24,
              y: 34,
            },
            {
              decoration: "plains_village",
              id: "Village",
              label: "Village",
              rotation: 0,
              x: 68,
              y: -38,
            },
          ]}
          onMarkerSelect={setSelected}
          onMapClick={setPoint}
        />
        <div>
          <p>Regional map</p>
          <p className="grass-note">
            {selected}
            {point ? ` · ${point.x}, ${point.y}` : ""}
          </p>
          <p className="grass-note">Select a marker or a point on the map.</p>
        </div>
      </div>
      <div className="demo-layout-demos-map-2 max-w-full">
        <LocatorBar
          scale={scale}
          heading={heading}
          markers={[
            {
              bearing: 0,
              color: "#55ff55",
              id: "Home",
              label: "Home waypoint",
              // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Locator shape is the geometric sprite variant (including bowtie) in this existing marker API, not structural metadata.
              shape: "default_3",
            },
            {
              bearing: 38,
              color: "#ffffff",
              id: "Village",
              label: "Village waypoint",
              // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Locator shape is the geometric sprite variant (including bowtie) in this existing marker API, not structural metadata.
              shape: "default_3",
            },
          ]}
          onMarkerSelect={setSelected}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          scale={scale}
          onClick={() => {
            setHeading((h) => (h + 345) % 360);
          }}
        >
          Turn left
        </Button>
        <Button
          scale={scale}
          onClick={() => {
            setHeading((h) => (h + 15) % 360);
          }}
        >
          Turn right
        </Button>
        <Button
          scale={scale}
          onClick={() => {
            setHeading(0);
          }}
        >
          Face north
        </Button>
      </div>
    </div>
  );
};

export { MapDemo as default };
