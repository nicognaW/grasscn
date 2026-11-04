import * as React from "react";

import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import { Label } from "../registry/ui/label";
import { RadioGroup, RadioGroupItem } from "../registry/ui/radio-group";
import type { DemoProps } from "../types";

const RadioGroupDemo = ({ scale }: DemoProps) => {
  const [value, setValue] = React.useState("survival");
  const [first, setFirst] = React.useState("Survival");
  const [disabled, setDisabled] = React.useState(false);

  const choices = [
    { value: "survival", label: first || " " },
    {
      label: "Creative",
      value: "creative",
    },
    {
      label: "Adventure",
      value: "adventure",
    },
  ];

  return (
    <>
      <div className="demo-options">
        <label>
          First choice
          <Input
            aria-label="First radio choice"
            value={first}
            onChange={(event) => {
              setFirst(event.target.value);
            }}
            className="w-45"
          />
        </label>
        <Button
          aria-pressed={disabled}
          onClick={() => {
            setDisabled((current) => !current);
          }}
        >{`Group: ${disabled ? "Disabled" : "Enabled"}`}</Button>
        <Button
          onClick={() => {
            setValue("");
          }}
        >
          Clear choice
        </Button>
      </div>
      <div className="demo-stage" data-stage="radio-group">
        <div className="demo-pair">
          <span>GAME MODE</span>
          <RadioGroup
            scale={scale}
            aria-label="Demo radio game mode"
            value={value}
            onValueChange={setValue}
            disabled={disabled}
          >
            {choices.map((choice) => (
              <div key={choice.value} className="flex items-center">
                <RadioGroupItem
                  id={`preview-radio-${choice.value}`}
                  value={choice.value}
                />
                <Label htmlFor={`preview-radio-${choice.value}`} scale={scale}>
                  {choice.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="demo-pair">
          <span>UNAVAILABLE CHOICE</span>
          <RadioGroup
            scale={scale}
            aria-label="Disabled radio example"
            defaultValue="locked"
            disabled
          >
            <div className="flex items-center">
              <RadioGroupItem id="preview-radio-locked" value="locked" />
              <Label htmlFor="preview-radio-locked" scale={scale}>
                Locked setting
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Selected radio game mode">
          {choices.find((choice) => choice.value === value)?.label ??
            "No choice"}
        </output>
        <span>One choice at a time</span>
      </div>
    </>
  );
};

export { RadioGroupDemo as default };
