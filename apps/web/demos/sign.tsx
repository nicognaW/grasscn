import type { DemoVariables } from "../demo-variables";
import * as React from 'react'
import {Sign,HangingSign,type SignWood} from '../registry/ui/sign'
import {Input} from '../registry/ui/input'
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '../registry/ui/select'
import type {DemoProps} from '../types'

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

export default function SignDemo({ scale }: DemoProps) {
  const [wood, setWood] = React.useState<SignWood>("oak"),
    [title, setTitle] = React.useState("Welcome");

  const lines = [title, "to grasscn", "", "Open daily"];

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-20"
      data-stage="sign"
    >
      <div className="flex gap-4 flex-wrap items-center">
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
        <Select
          scale={scale}
          value={wood}
          onValueChange={(value) => {
            setWood(value as SignWood);
          }}
        >
          <SelectTrigger aria-label="Wood type" style={{ width: 120 * scale }}>
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
      <div className="flex items-center gap-6 flex-wrap">
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
}
