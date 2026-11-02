import { RadioGroup, RadioGroupItem } from "@grasscn/web/ui/radio-group";
import * as React from "react";

const root = React.createRef<HTMLDivElement>();
const item = React.createRef<HTMLButtonElement>();

const valid = (
  <RadioGroup
    ref={root}
    scale={3}
    name="mode"
    required
    value="survival"
    onValueChange={() => {
      /* empty */
    }}
    dir="rtl"
  >
    <RadioGroupItem ref={item} value="survival" />
    <RadioGroupItem value="creative" disabled />
  </RadioGroup>
);

const composition = (
  <RadioGroup render={<fieldset />}>
    <RadioGroupItem value="survival" render={<button type="button" />}>
      {undefined}
    </RadioGroupItem>
  </RadioGroup>
);

// @ts-expect-error Item values are required by the radio-group API.
const missing = <RadioGroupItem />;

// @ts-expect-error Only integer native GUI scales are supported.
const fractional = <RadioGroup scale={1.5} />;

void [valid, composition, missing, fractional];
