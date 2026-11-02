import * as React from "react";

import { Calendar } from "../registry/ui/calendar";
import { Label } from "../registry/ui/label";
export function Demo({ scale = 2 }: { scale?: 1 | 2 | 3 }) {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 9, 30)
  );
  return (
    <div
      className="demo-stage"
      data-stage="calendar"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        gap: 8 * scale,
      }}
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
}

export default Demo;
