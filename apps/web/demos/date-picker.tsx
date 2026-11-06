import type { DemoVariables } from "../demo-variables";
import {
  DatePickerDemo,
  DatePickerRangeDemo,
} from "../registry/blocks/date-picker";
import { Button } from "../registry/ui/button";
import { MinecraftProse } from "../registry/ui/minecraft-prose";
import type { DemoProps } from "../types";

const DatePickerExamples = ({ scale }: DemoProps) => (
  <div
    className="demo-stage demo-stage-display-grid grid-cols-1"
    data-stage="date-picker"
    style={
      /* SAFETY: satisfies checks --demo-stage-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
      {
        "--demo-stage-gap": `${8 * scale}px`,
      } satisfies DemoVariables as DemoVariables
    }
  >
    <MinecraftProse as="span" scale={scale}>
      Journey begins
    </MinecraftProse>
    <DatePickerDemo scale={scale} />
    <MinecraftProse as="span" scale={scale}>
      Expedition range
    </MinecraftProse>
    <DatePickerRangeDemo scale={scale} />
    <Button scale={scale} disabled>
      Unavailable
    </Button>
  </div>
);

export { DatePickerExamples as default };
