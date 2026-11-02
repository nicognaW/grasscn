import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../registry/ui/select";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

const initial = [
  "Survival",
  "Creative",
  "Adventure",
  "Spectator",
  "Hardcore",
  "Peaceful",
  "Easy",
  "Normal",
  "Hard",
];

export default function SelectDemo({ scale }: DemoProps) {
  const [value, setValue] = React.useState("mode-0");
  const [disabled, setDisabled] = React.useState(false);
  const [title, setTitle] = React.useState("Survival");
  const [disabledOption, setDisabledOption] = React.useState(true);
  const titles = [title || " ", ...initial.slice(1)];

  return (
    <>
      <div className="demo-options">
        <label>
          First option
          <Input
            aria-label="First select option"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-45"
          />
        </label>
        <Button
          aria-pressed={disabled}
          onClick={() => setDisabled((current) => !current)}
        >{`Select: ${disabled ? "Disabled" : "Enabled"}`}</Button>
        <Button
          aria-pressed={disabledOption}
          onClick={() => setDisabledOption((current) => !current)}
        >{`Creative: ${disabledOption ? "Disabled" : "Enabled"}`}</Button>
      </div>
      <div className="demo-stage" data-stage="select">
        <div className="demo-pair">
          <label htmlFor="preview-mode-select">
            GAME MODE
          </label>
          <Select
            items={titles.map((label, index) => ({
              label,
              value: `mode-${index}`,
            }))}
            scale={scale}
            value={value}
            onValueChange={(selectedValue) => setValue(selectedValue ?? "")}
            disabled={disabled}
          >
            <SelectTrigger id="preview-mode-select" aria-label="Demo game mode">
              <SelectValue placeholder="Choose game mode" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} sideOffset={2 * scale}>
              {titles.map((label, index) => (
                <SelectItem
                  key={index}
                  value={`mode-${index}`}
                  disabled={index === 1 && disabledOption}
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="demo-pair">
          <label htmlFor="preview-mode-empty">
            PLACEHOLDER
          </label>
          <Select
            scale={scale}
            items={initial
              .slice(0, 3)
              .map((label, index) => ({ value: `choice-${index}`, label }))}
          >
            <SelectTrigger id="preview-mode-empty" aria-label="Empty game mode">
              <SelectValue placeholder="Choose game mode" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} sideOffset={2 * scale}>
              {initial.slice(0, 3).map((label, index) => (
                <SelectItem key={index} value={`choice-${index}`}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Selected preview game mode">
          {titles[Number(value.slice(5))]}
        </output>
        <span>Choose with the mouse or arrow keys</span>
      </div>
    </>
  );
}
