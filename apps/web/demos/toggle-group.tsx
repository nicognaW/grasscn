import * as React from "react";

import { Button } from "../registry/ui/button";
import { Label } from "../registry/ui/label";
import { ToggleGroup, ToggleGroupItem } from "../registry/ui/toggle-group";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const ToggleGroupDemo = ({ scale }: DemoProps) => {
  const { ref: stageRef, width: stageWidth } = useDemoWidth(scale);
  const id = React.useId();

  const [single, setSingle] = React.useState("crafting");
  const [multiple, setMultiple] = React.useState<string[]>(["crafting"]);
  const [disabled, setDisabled] = React.useState(false);

  const filters = [
    {
      label: "Crafting recipes",
      value: "crafting",
    },
    {
      label: "Furnace recipes",
      value: "furnace",
    },
    {
      label: "Stonecutter recipes",
      value: "stonecutter",
    },
  ];

  return (
    <>
      <div className="demo-options">
        <Button
          onClick={() => {
            setDisabled((v) => !v);
          }}
        >
          {disabled ? "Enable filters" : "Disable filters"}
        </Button>
        <Button
          onClick={() => {
            setSingle("crafting");
            setMultiple(["crafting"]);
          }}
        >
          Reset filters
        </Button>
      </div>
      <div ref={stageRef} className="demo-stage" data-stage="toggle-group">
        <div className="demo-pair">
          <Label scale={scale} maxWidth={stageWidth}>
            One crafting station
          </Label>
          <ToggleGroup
            aria-label="One recipe station"
            scale={scale}
            value={[single]}
            onValueChange={(__values) => {
              setSingle(__values[0] ?? "");
            }}
            disabled={disabled}
            multiple={false}
          >
            {filters.map((f) => (
              <div className="demo-filter-choice" key={f.value}>
                <ToggleGroupItem
                  id={`${id}-single-${f.value}`}
                  value={f.value}
                  aria-label={f.label}
                />
                <Label htmlFor={`${id}-single-${f.value}`} scale={scale}>
                  {f.label.replace(" recipes", "")}
                </Label>
              </div>
            ))}
          </ToggleGroup>
        </div>
        <div className="demo-pair">
          <Label scale={scale} maxWidth={stageWidth}>
            Several crafting stations
          </Label>
          <ToggleGroup
            aria-label="Several recipe stations"
            scale={scale}
            value={multiple}
            onValueChange={(__values) => {
              setMultiple(__values);
            }}
            disabled={disabled}
            multiple={true}
          >
            {filters.map((f) => (
              <div className="demo-filter-choice" key={f.value}>
                <ToggleGroupItem
                  id={`${id}-multiple-${f.value}`}
                  value={f.value}
                  aria-label={f.label}
                />
                <Label htmlFor={`${id}-multiple-${f.value}`} scale={scale}>
                  {f.label.replace(" recipes", "")}
                </Label>
              </div>
            ))}
          </ToggleGroup>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Single recipe station">{single || "None"}</output>
        <output aria-label="Multiple recipe stations">
          {multiple.join(", ") || "None"}
        </output>
      </div>
    </>
  );
};

export { ToggleGroupDemo as default };
