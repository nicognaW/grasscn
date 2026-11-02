import type { DemoVariables } from "../demo-variables";
import {DatePickerDemo,DatePickerRangeDemo} from "../registry/blocks/date-picker"
import {Label} from "../registry/ui/label"
import {Button} from "../registry/ui/button"
import type {DemoProps} from "../types"
export default function DatePickerExamples({scale}:DemoProps){return <div className="demo-stage demo-stage-display-grid grid-cols-1" data-stage="date-picker" style={/* SAFETY: satisfies checks --demo-stage-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */({"--demo-stage-gap": `${8*scale}px`} satisfies DemoVariables) as DemoVariables}><Label scale={scale}>Journey begins</Label><DatePickerDemo scale={scale}/><Label scale={scale}>Expedition range</Label><DatePickerRangeDemo scale={scale}/><Button scale={scale} disabled>Unavailable</Button></div>}
