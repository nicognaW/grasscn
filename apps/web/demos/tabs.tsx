import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import { Checkbox } from "../registry/ui/checkbox";
import { Input } from "../registry/ui/input";
import { Label } from "../registry/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../registry/ui/tabs";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const TabsDemo = ({ scale }: DemoProps) => {
  const { ref: stageRef, width: stageWidth } = useDemoWidth(scale);
  const [title, setTitle] = React.useState("Game");
  const [value, setValue] = React.useState("game");
  const [disabled, setDisabled] = React.useState(false);
  const [structures, setStructures] = React.useState(true);
  const [world, setWorld] = React.useState("New World");

  const panelStyle: DemoVariables = {
    "--demo-owned-tabs-panel-height": `${64 * scale}px`,
    "--demo-owned-tabs-panel-padding": `${8 * scale}px`,
  };

  const demoLayout1: DemoVariables = {
    "--demo-owned-tabs-1-min-width": `${152 * scale}px`,
    "--demo-owned-tabs-1-width": `${303 * scale}px`,
  };

  let activeTitle = "More";

  if (value === "game") {
    activeTitle = title || " ";
  } else if (value === "world") {
    activeTitle = "World";
  }

  return (
    <>
      <div className="demo-options">
        <label>
          First tab
          <Input
            aria-label="First tab title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className="w-45"
          />
        </label>
        <Button
          aria-pressed={disabled}
          onClick={() => {
            setDisabled((current) => !current);
          }}
        >{`More tab: ${disabled ? "Disabled" : "Enabled"}`}</Button>
      </div>
      <div ref={stageRef} className="demo-stage" data-stage="tabs">
        <Tabs
          scale={scale}
          value={value}
          onValueChange={setValue}
          className="demo-owned-tabs-1"
          style={demoLayout1}
        >
          <TabsList aria-label="World settings" activateOnFocus>
            <TabsTrigger value="game">{title || " "}</TabsTrigger>
            <TabsTrigger value="world">World</TabsTrigger>
            <TabsTrigger value="more" disabled={disabled}>
              More
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="game"
            className="demo-owned-tabs-panel"
            style={panelStyle}
          >
            <div className="demo-pair">
              <Label htmlFor="tabs-world-name" scale={scale}>
                World name
              </Label>
              <Input
                id="tabs-world-name"
                aria-label="Tabs world name"
                scale={scale}
                value={world}
                onChange={(event) => {
                  setWorld(event.target.value);
                }}
                className="w-(--demo-width)"
                style={
                  /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
                  {
                    "--demo-width": `${200 * scale}px`,
                  } satisfies DemoVariables as DemoVariables
                }
              />
            </div>
          </TabsContent>
          <TabsContent
            value="world"
            className="demo-owned-tabs-panel"
            style={panelStyle}
          >
            <div>
              <Checkbox
                id="tabs-structures"
                scale={scale}
                checked={structures}
                onCheckedChange={(next) => {
                  setStructures(next);
                }}
              />
              <Label
                htmlFor="tabs-structures"
                scale={scale}
                maxWidth={Math.max(1, stageWidth - 33 - Math.ceil(16 / scale))}
              >
                Generate structures
              </Label>
            </div>
          </TabsContent>
          <TabsContent
            value="more"
            className="demo-owned-tabs-panel"
            style={panelStyle}
          >
            <Button
              scale={scale}
              onClick={() => {
                setWorld("New World");
                setStructures(true);
              }}
            >
              Reset settings
            </Button>
          </TabsContent>
        </Tabs>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Active settings tab">{activeTitle}</output>
        <span>Arrow keys change tabs</span>
      </div>
    </>
  );
};

export { TabsDemo as default };
