import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import { Separator } from "../registry/ui/separator";
import type { DemoProps } from "../types";

const SeparatorDemo = ({ scale }: DemoProps) => {
  const [width, setWidth] = React.useState(200);

  const demoLayout1: DemoVariables = {
    "--demo-owned-separator-1-width": `${width * scale}px`,
  };

  const demoLayout2: DemoVariables = {
    "--demo-owned-separator-2-width": `${width * scale}px`,
  };

  return (
    <>
      <div className="demo-options">
        <Button
          aria-label={`Separator width: ${width} px`}
          onClick={() => {
            const widths = [103, 200, 257];
            setWidth(widths[(widths.indexOf(width) + 1) % widths.length]);
          }}
        >{`Width: ${width} px`}</Button>
      </div>
      <div className="demo-stage" data-stage="separator">
        <div className="demo-pair">
          <span>MENU HEADER</span>
          <Separator
            scale={scale}
            className="demo-owned-separator-1"
            style={demoLayout1}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This calls Separator's explicit semantic-role API on its div primitive; replacing the component with hr drops its artwork and scale contract.
            role="separator"
            aria-label="Menu header separator"
          />
        </div>
        <div className="demo-pair">
          <span>MENU FOOTER</span>
          <Separator
            scale={scale}
            edge="footer"
            className="demo-owned-separator-2"
            style={demoLayout2}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This calls Separator's explicit semantic-role API on its div primitive; replacing the component with hr drops its artwork and scale contract.
            role="separator"
            aria-label="Menu footer separator"
          />
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Separator width">{width} px</output>
        <span>Separate content and actions</span>
      </div>
    </>
  );
};

export { SeparatorDemo as default };
