import * as React from "react";

import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../registry/ui/select";
import type { DemoProps } from "../types";

const initial = [
  { label: "Survival", value: "mode-0" },
  { label: "Creative", value: "mode-1" },
  { label: "Adventure", value: "mode-2" },
  { label: "Spectator", value: "mode-3" },
  { label: "Hardcore", value: "mode-4" },
  { label: "Peaceful", value: "mode-5" },
  { label: "Easy", value: "mode-6" },
  { label: "Normal", value: "mode-7" },
  { label: "Hard", value: "mode-8" },
] as const;

const choices = initial.slice(0, 3).map((option, index) => ({
  label: option.label,
  value: `choice-${index}`,
}));

const SelectDemo = ({ scale }: DemoProps) => {
  const [value, setValue] = React.useState("mode-0");
  const [disabled, setDisabled] = React.useState(false);
  const [title, setTitle] = React.useState("Survival");
  const [disabledOption, setDisabledOption] = React.useState(true);
  const modes = [{ ...initial[0], label: title || " " }, ...initial.slice(1)];

  return (
    <>
      <div className="demo-options">
        <label>
          First option
          <Input
            aria-label="First select option"
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
        >{`Select: ${disabled ? "Disabled" : "Enabled"}`}</Button>
        <Button
          aria-pressed={disabledOption}
          onClick={() => {
            setDisabledOption((current) => !current);
          }}
        >{`Creative: ${disabledOption ? "Disabled" : "Enabled"}`}</Button>
      </div>
      <div className="demo-stage" data-stage="select">
        <div className="demo-pair">
          <label htmlFor="preview-mode-select">GAME MODE</label>
          <Select
            items={modes}
            scale={scale}
            value={value}
            onValueChange={(selectedValue) => {
              setValue(selectedValue ?? "");
            }}
            disabled={disabled}
          >
            <SelectTrigger id="preview-mode-select" aria-label="Demo game mode">
              <SelectValue placeholder="Choose game mode" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} sideOffset={2 * scale}>
              {modes.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.value === "mode-1" && disabledOption}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="demo-pair">
          <label htmlFor="preview-mode-empty">PLACEHOLDER</label>
          <Select scale={scale} items={choices}>
            <SelectTrigger id="preview-mode-empty" aria-label="Empty game mode">
              <SelectValue placeholder="Choose game mode" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} sideOffset={2 * scale}>
              {choices.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Selected preview game mode">
          {modes[Number(value.slice(5))]?.label}
        </output>
        <span>Choose with the mouse or arrow keys</span>
      </div>
    </>
  );
};

export { SelectDemo as default };
