import * as React from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";

import { Button } from "../registry/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../registry/ui/card";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../registry/ui/resizable";
import type { DemoProps } from "../types";

export default function ResizableDemo({ scale }: DemoProps) {
  const identity = React.useId();
  const left = `${identity}-left`;
  const right = `${identity}-right`;
  const [orientation, setOrientation] = React.useState<
      "horizontal" | "vertical"
    >("horizontal"),
    [layout, setLayout] = React.useState("50% / 50%"),
    [selected, setSelected] = React.useState("Choose supplies or a recipe"),
    group = React.useRef<GroupImperativeHandle>(null);

  return (
    <>
      <div className="demo-options">
        <Button
          type="button"
          scale={scale}
          style={{ width: 120 * scale }}
          onClick={() => {
            setOrientation((v) =>
              v === "horizontal" ? "vertical" : "horizontal"
            );
          }}
        >
          Change direction
        </Button>
        <Button
          type="button"
          scale={scale}
          style={{ width: 100 * scale }}
          onClick={() => {
            group.current?.setLayout({ [left]: 50, [right]: 50 });
          }}
        >
          Reset panels
        </Button>
      </div>
      <div className="demo-stage" data-stage="resizable">
        <ResizablePanelGroup
          scale={scale}
          orientation={orientation}
          groupRef={group}
          style={{
            width: Math.min(560, 280 * scale),
            maxWidth: "100%",
            height: 140 * scale,
          }}
          onLayoutChanged={(value) => {
            setLayout(
              `${Math.round(value[left] ?? 50)}% / ${Math.round(value[right] ?? 50)}%`
            );
          }}
        >
          <ResizablePanel id={left} defaultSize="50%" minSize="30%">
            <Card
              scale={scale}
              style={{
                width: "100%",
                height: "100%",
                padding: 4 * scale,
                gap: 8 * scale,
                overflow: "hidden",
              }}
            >
              <CardHeader>
                <CardTitle>Bag</CardTitle>
              </CardHeader>
              <CardContent style={{ display: "grid", gap: 4 * scale }}>
                {["Log", "Ore", "Gem"].map((label) => (
                  <Button
                    key={label}
                    scale={scale}
                    onClick={() => setSelected(label)}
                    style={{ width: "100%" }}
                  >
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize inventory panels" />
          <ResizablePanel id={right} defaultSize="50%" minSize="30%">
            <Card
              scale={scale}
              style={{
                width: "100%",
                height: "100%",
                padding: 4 * scale,
                gap: 8 * scale,
                overflow: "hidden",
              }}
            >
              <CardHeader>
                <CardTitle>Grid</CardTitle>
              </CardHeader>
              <CardContent style={{ display: "grid", gap: 4 * scale }}>
                {["Axe", "Hoe", "Map"].map((label) => (
                  <Button
                    key={label}
                    scale={scale}
                    onClick={() => setSelected(label)}
                    style={{ width: "100%" }}
                  >
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <div className="demo-result">
        <span className="status-dot" />
        <output aria-label="Resizable layout">{layout}</output>
        <output aria-label="Resizable selection">{selected}</output>
        <span>
          Drag between the arrows. Focus the divider and use arrow keys.
        </span>
      </div>
    </>
  );
}
