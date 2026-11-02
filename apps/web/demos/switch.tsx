import * as React from "react"
import { Switch } from "../registry/ui/switch"
import { Label } from "../registry/ui/label"
import { Input } from "../registry/ui/input"
import { Button } from "../registry/ui/button"
import type { DemoProps } from "../types"

export default function SwitchDemo({ scale }: DemoProps) {
  const [checked, setChecked] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const [label, setLabel] = React.useState("Enable clouds");

  return (
    <>
      <div className="demo-options">
        <label>
          Setting label
          <Input
            aria-label="Switch setting label"
            value={label}
            onChange={(event) => { setLabel(event.target.value); }}
            className="w-45"
          />
        </label>
        <Button
          aria-pressed={disabled}
          onClick={() => { setDisabled((current) => !current); }}
        >{`Switch: ${disabled ? "Disabled" : "Enabled"}`}</Button>
      </div>
      <div className="demo-stage" data-stage="switch">
        <div className="demo-pair">
          <Label htmlFor="preview-switch" scale={scale}>
            {label || " "}
          </Label>
          <Switch
            id="preview-switch"
            scale={scale}
            checked={checked}
            onCheckedChange={setChecked}
            disabled={disabled}
          />
        </div>
        <div className="demo-pair">
          <Label htmlFor="preview-switch-locked" scale={scale}>
            Locked setting
          </Label>
          <Switch id="preview-switch-locked" scale={scale} checked disabled />
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Switch setting value">
          {checked ? "ON" : "OFF"}
        </output>
        <span>Change your preference</span>
      </div>
    </>
  );
}
