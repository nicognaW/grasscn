import * as React from 'react'
import {MinecraftMap,LocatorBar} from '../registry/ui/map'
import {Button} from '../registry/ui/button'
import type {DemoProps} from '../types'
import {getWorldMapPixels} from './map-world-data'

const MapDemo = ({ scale }: DemoProps) => {
  const [heading, setHeading] = React.useState(0);
  const [selected, setSelected] = React.useState("Home");
  const [point, setPoint] = React.useState<{ x: number; y: number }>();

  const pixels = React.useMemo(getWorldMapPixels, []);

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-20 max-w-full"
      data-stage="map"
    >
      <div
        style={{
          alignItems: "start",
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
        }}
      >
        <MinecraftMap
          scale={scale}
          pixels={pixels}
          aria-label="Regional map"
          markers={[
            {
              id: "Home",
              label: "Home",
              x: -24,
              y: 34,
              decoration: "frame",
              rotation: 0,
            },
            {
              id: "Village",
              label: "Village",
              x: 68,
              y: -38,
              decoration: "plains_village",
              rotation: 0,
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
      <div style={{ maxWidth: "100%", overflowX: "auto", padding: "12px 2px" }}>
        <LocatorBar
          scale={scale}
          heading={heading}
          markers={[
            {
              id: "Home",
              label: "Home waypoint",
              bearing: 0,
              color: "#55ff55",
              shape: "default_3",
            },
            {
              id: "Village",
              label: "Village waypoint",
              bearing: 38,
              color: "#ffffff",
              shape: "default_3",
            },
          ]}
          onMarkerSelect={setSelected}
        />
      </div>
      <div className="flex gap-3 flex-wrap">
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
