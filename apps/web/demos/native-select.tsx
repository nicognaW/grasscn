import * as React from "react";
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "../registry/ui/native-select";
import { Label } from "../registry/ui/label";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--demo-stage-gap": `${number}px`;
}

export const Demo = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const [value, setValue] = React.useState("survival");

  return (
    <div
      className="demo-stage demo-layout-demos-native-select-1 demo-stage-display-grid"
      data-stage="native-select"
      style={
        // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
        {
          "--demo-stage-gap": `${8 * scale}px`,
        } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
      }
    >
      <Label htmlFor="native-mode" scale={scale}>
        World mode
      </Label>
      <NativeSelect
        id="native-mode"
        scale={scale}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      >
        <NativeSelectOptGroup label="Game modes">
          <NativeSelectOption value="survival">Survival</NativeSelectOption>
          <NativeSelectOption value="creative">Creative</NativeSelectOption>
          <NativeSelectOption value="world">世界</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
      <NativeSelect scale={scale} disabled>
        <NativeSelectOption>Unavailable</NativeSelectOption>
      </NativeSelect>
    </div>
  );
};

export default Demo;
