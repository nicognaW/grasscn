import * as React from "react";

import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

const InputDemo = ({ scale }: DemoProps) => {
  const [value, setValue] = React.useState("Hello Minecraft");

  return (
    <>
      <div className="demo-stage" data-stage="input">
        <div className="demo-pair">
          <label htmlFor="preview-input">EDITABLE</label>
          <Input
            id="preview-input"
            aria-label="Demo input"
            scale={scale}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
            placeholder="Search..."
          />
        </div>
        <div className="demo-pair">
          <label htmlFor="preview-input-readonly">READ ONLY</label>
          <Input
            id="preview-input-readonly"
            aria-label="Read-only demo input"
            scale={scale}
            value="Hello Minecraft"
            readOnly
          />
        </div>
        <div className="demo-pair">
          <label htmlFor="preview-input-disabled">DISABLED</label>
          <Input
            id="preview-input-disabled"
            aria-label="Disabled demo input"
            scale={scale}
            value="Hello Minecraft"
            disabled
          />
        </div>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />
        <output aria-label="Input character count">
          {value.length} characters
        </output>
        <span>Native text editing</span>
      </div>
    </>
  );
};

export { InputDemo as default };
