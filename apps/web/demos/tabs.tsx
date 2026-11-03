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
  const stage = useDemoWidth(scale);
  const [title, setTitle] = React.useState("Game");
  const [value, setValue] = React.useState("game");
  const [disabled, setDisabled] = React.useState(false);
  const [structures, setStructures] = React.useState(true);
  const [world, setWorld] = React.useState("New World");

  const panelStyle = {
    height: 64 * scale,
    padding: 8 * scale,
    boxSizing: "border-box" as const,
  };

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
      <div ref={stage.ref} className="demo-stage" data-stage="tabs">
        <Tabs
          scale={scale}
          value={value}
          onValueChange={setValue}
          style={{ flexShrink: 0, minWidth: 152 * scale, width: 303 * scale }}
        >
          <TabsList aria-label="World settings" activateOnFocus>
            <TabsTrigger value="game">{title || " "}</TabsTrigger>
            <TabsTrigger value="world">World</TabsTrigger>
            <TabsTrigger value="more" disabled={disabled}>
              More
            </TabsTrigger>
          </TabsList>
          <TabsContent value="game" style={panelStyle}>
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
          <TabsContent value="world" style={panelStyle}>
            <div className="checkbox-row">
              <Checkbox
                id="tabs-structures"
                scale={scale}
                checked={structures}
                onCheckedChange={(next) => {
                  setStructures(next === true);
                }}
              />
              <Label
                htmlFor="tabs-structures"
                scale={scale}
                maxWidth={Math.max(1, stage.width - 33 - Math.ceil(16 / scale))}
              >
                Generate structures
              </Label>
            </div>
          </TabsContent>
          <TabsContent value="more" style={panelStyle}>
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
        <output aria-label="Active settings tab">
          {value === "game"
            ? title || " "
            : value === "world"
              ? "World"
              : "More"}
        </output>
        <span>Arrow keys change tabs</span>
      </div>
    </>
  );
};

export { TabsDemo as default };
