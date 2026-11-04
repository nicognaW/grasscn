import * as React from "react";

import { Input } from "../registry/ui/input";
import { RedstoneLampDisplay } from "../registry/ui/redstone-lamp-display";
import type { DemoProps } from "../types";

const DIGITS = /^\d{1,12}$/u;

// The demo default 1234 is the display's website default path (Base mapping).
const RedstoneLampDisplayDemo = ({ scale }: DemoProps) => {
  const [input, setInput] = React.useState("1234");
  const [shown, setShown] = React.useState("1234");

  const change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setInput(next);

    if (DIGITS.test(next)) {
      setShown(String(Number(next)));
    }
  };

  return (
    /* eslint-disable shadcn/no-unknown-classes -- These playground classes are defined in components/documentation.css and components/home/homepage.css. */
    <div className="demo-stage" data-stage="redstone-lamp-display">
      <RedstoneLampDisplay value={shown} />
      <div className="demo-pair">
        <label className="sample-caption" htmlFor="redstone-lamp-value">
          NUMBER
        </label>
        <Input
          id="redstone-lamp-value"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          scale={scale}
          value={input}
          onChange={change}
        />
      </div>
      <p className="grass-note">
        Enter a whole number. Each digit is a 3x5 wall of Redstone Lamps.
      </p>
    </div>
    /* eslint-enable shadcn/no-unknown-classes */
  );
};

export default RedstoneLampDisplayDemo;
