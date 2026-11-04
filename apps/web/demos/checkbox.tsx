import * as React from "react";

import { Checkbox } from "../registry/ui/checkbox";
import type { DemoProps } from "../types";

interface CheckboxPreviewPaint extends React.CSSProperties {
  "--preview-scale": number;
}

const CheckboxDemo = ({ scale }: DemoProps) => {
  const [checked, setChecked] = React.useState(false);

  return (
    <>
      <div
        className="demo-stage"
        data-stage="checkbox"
        style={
          // SAFETY: --preview-scale is this owner's CSS custom-property channel; this CSSProperties view passes the exact owned variable map to React without changing its values.
          {
            "--preview-scale": scale,
          } satisfies CheckboxPreviewPaint as CheckboxPreviewPaint
        }
      >
        <div>
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
        <div>
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
        <span />
        <output aria-label="Checkbox value">
          {checked ? "Checked" : "Unchecked"}
        </output>
        <span>Boolean states</span>
      </div>
    </>
  );
};

export { CheckboxDemo as default };
