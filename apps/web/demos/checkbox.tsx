import * as React from "react";

import { Checkbox } from "../registry/ui/checkbox";
import type { DemoProps } from "../types";

export default function CheckboxDemo({ scale }: DemoProps) {
  const [checked, setChecked] = React.useState(false);
  return (
    <>
      <div
        className="demo-stage checkbox-stage"
        data-stage="checkbox"
        style={{ "--preview-scale": scale } as React.CSSProperties}
      >
        <div className="checkbox-row">
          <Checkbox
            id="preview-checkbox"
            scale={scale}
            checked={checked}
            onCheckedChange={(value) => {
              setChecked(value === true);
            }}
          />
          <label htmlFor="preview-checkbox">Enable shadows</label>
        </div>
        <div className="checkbox-row muted">
          <Checkbox
            id="preview-checkbox-disabled"
            scale={scale}
            checked
            disabled
          />
          <label htmlFor="preview-checkbox-disabled">Unavailable</label>
        </div>
      </div>
      <div className="demo-result" aria-live="polite">
        <span className="status-dot" />
        <output aria-label="Checkbox value">
          {checked ? "Checked" : "Unchecked"}
        </output>
        <span>Boolean states</span>
      </div>
    </>
  );
}
