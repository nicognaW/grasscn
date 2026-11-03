import * as React from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../registry/ui/card";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../registry/ui/resizable";
import type { DemoProps } from "../types";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-demos-resizable-1-padding": `${number}px`;
  "--mc-intrinsic-demos-resizable-1-gap": `${number}px`;
}

interface IntrinsicLayoutStyle2 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-demos-resizable-2-gap": `${number}px`;
}

interface IntrinsicLayoutStyle3 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-demos-resizable-3-padding": `${number}px`;
  "--mc-intrinsic-demos-resizable-3-gap": `${number}px`;
}

interface IntrinsicLayoutStyle4 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-demos-resizable-4-gap": `${number}px`;
}

const ResizableDemo = ({ scale }: DemoProps) => {
  const identity = React.useId();
  const left = `${identity}-left`;
  const right = `${identity}-right`;

  const [orientation, setOrientation] = React.useState<
    "horizontal" | "vertical"
  >("horizontal");

  const [layout, setLayout] = React.useState("50% / 50%");
  const [selected, setSelected] = React.useState("Choose supplies or a recipe");
  const group = React.useRef<GroupImperativeHandle>(null);

  return (
    <>
      <div className="demo-options">
        <Button
          type="button"
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${120 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
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
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${100 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
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
              className="w-full h-full p-(--mc-intrinsic-demos-resizable-1-padding) gap-(--mc-intrinsic-demos-resizable-1-gap) overflow-hidden"
              style={
                // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                {
                  "--mc-intrinsic-demos-resizable-1-gap": `${8 * scale}px`,
                  "--mc-intrinsic-demos-resizable-1-padding": `${4 * scale}px`,
                } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
              }
            >
              <CardHeader>
                <CardTitle>Bag</CardTitle>
              </CardHeader>
              <CardContent
                className="grid gap-(--mc-intrinsic-demos-resizable-2-gap)"
                style={
                  // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                  {
                    "--mc-intrinsic-demos-resizable-2-gap": `${4 * scale}px`,
                  } satisfies IntrinsicLayoutStyle2 as IntrinsicLayoutStyle2
                }
              >
                {["Log", "Ore", "Gem"].map((label) => (
                  <Button
                    key={label}
                    scale={scale}
                    onClick={() => {
                      setSelected(label);
                    }}
                    className="w-full"
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
              className="w-full h-full p-(--mc-intrinsic-demos-resizable-3-padding) gap-(--mc-intrinsic-demos-resizable-3-gap) overflow-hidden"
              style={
                // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                {
                  "--mc-intrinsic-demos-resizable-3-gap": `${8 * scale}px`,
                  "--mc-intrinsic-demos-resizable-3-padding": `${4 * scale}px`,
                } satisfies IntrinsicLayoutStyle3 as IntrinsicLayoutStyle3
              }
            >
              <CardHeader>
                <CardTitle>Grid</CardTitle>
              </CardHeader>
              <CardContent
                className="grid gap-(--mc-intrinsic-demos-resizable-4-gap)"
                style={
                  // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                  {
                    "--mc-intrinsic-demos-resizable-4-gap": `${4 * scale}px`,
                  } satisfies IntrinsicLayoutStyle4 as IntrinsicLayoutStyle4
                }
              >
                {["Axe", "Hoe", "Map"].map((label) => (
                  <Button
                    key={label}
                    scale={scale}
                    onClick={() => {
                      setSelected(label);
                    }}
                    className="w-full"
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
        <span />
        <output aria-label="Resizable layout">{layout}</output>
        <output aria-label="Resizable selection">{selected}</output>
        <span>
          Drag between the arrows. Focus the divider and use arrow keys.
        </span>
      </div>
    </>
  );
};

export { ResizableDemo as default };
