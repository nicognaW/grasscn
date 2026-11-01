import {DatePickerDemo,DatePickerRangeDemo} from "../../registry/blocks/date-picker"
import {Label} from "../../registry/ui/label"
import {Button} from "../../registry/ui/button"
import type {DemoProps} from "../types"
export default function DatePickerExamples({scale}:DemoProps){return <div className="demo-stage" data-stage="date-picker" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:8*scale}}><Label scale={scale}>Journey begins</Label><DatePickerDemo scale={scale}/><Label scale={scale}>Expedition range</Label><DatePickerRangeDemo scale={scale}/><Button scale={scale} disabled>Unavailable</Button></div>}
