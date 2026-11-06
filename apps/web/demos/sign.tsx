import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import type { DemoVariables } from "../demo-variables";
import { Input } from "../registry/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../registry/ui/select";
import type { SignWood } from "../registry/ui/sign";
import { Sign, HangingSign } from "../registry/ui/sign";
import type { DemoProps } from "../types";

interface PresentationLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-presentation-demos-sign-1-width": `${number}px`;
}

const woods: SignWood[] = [
  "oak",
  "spruce",
  "birch",
  "jungle",
  "acacia",
  "dark_oak",
  "mangrove",
  "cherry",
  "bamboo",
  "crimson",
  "warped",
  "pale_oak",
];

const initialWood = "oak";

const SignDemo = ({ scale }: DemoProps) => {
  const [wood, setWood] = React.useState<SignWood>(initialWood);
  const [title, setTitle] = React.useState("Welcome");

  const lines = [title, "to grasscn", "", "Open daily"];

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-20"
      data-stage="sign"
    >
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor="sign-label">First line</label>
        <Input
          id="sign-label"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          maxLength={15}
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${180 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        />
        <Select<SignWood>
          scale={scale}
          value={wood}
          onValueChange={(value) => {
            setWood(value ?? initialWood);
          }}
        >
          <SelectTrigger
            aria-label="Wood type"
            className="w-(--mc-presentation-demos-sign-1-width)"
            style={
              // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
              {
                "--mc-presentation-demos-sign-1-width": `${120 * scale}px`,
              } satisfies PresentationLayoutStyle1 as PresentationLayoutStyle1
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {woods.map((value) => (
              <SelectItem key={value} value={value}>
                {value.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <Sign
          lines={lines}
          wood={wood}
          scale={scale}
          aria-label="Standing sign"
        />
        <HangingSign
          lines={lines}
          wood={wood}
          scale={scale}
          aria-label="Hanging sign"
        />
      </div>
    </div>
  );
};

export { SignDemo as default };
