import * as React from "react";

import { Calendar } from "../registry/ui/calendar";
import { Label } from "../registry/ui/label";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--demo-stage-gap": `${number}px`;
}

export const Demo = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 9, 30)
  );

  return (
    <div
      className="demo-stage demo-layout-demos-calendar-1 demo-stage-display-grid"
      data-stage="calendar"
      style={
        // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
        {
          "--demo-stage-gap": `${8 * scale}px`,
        } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
      }
    >
      <Calendar
        scale={scale}
        mode="single"
        selected={date}
        onSelect={setDate}
        defaultMonth={new Date(2026, 9)}
      />
      <Label scale={scale}>
        {date ? date.toLocaleDateString("en-US") : "No day selected"}
      </Label>
      <Calendar
        scale={scale}
        mode="range"
        defaultMonth={new Date(2026, 9)}
        captionLayout="dropdown"
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2030, 11)}
      />
    </div>
  );
};

export default Demo;
