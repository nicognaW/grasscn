import * as React from 'react';
import { DatePicker } from '../../registry/ui/date-picker';
import { Label } from '../../registry/ui/label';
import type { DateRange } from 'react-day-picker';
export function Demo({ scale = 2 }: {
    scale?: 1 | 2 | 3;
}) { const [day, setDay] = React.useState<Date>(), [range, setRange] = React.useState<DateRange | undefined>(); return <div className="demo-stage" data-stage="date-picker" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 8 * scale }}><Label scale={scale}>Journey begins</Label><DatePicker scale={scale} mode="single" selected={day} onSelect={setDay} defaultMonth={new Date(2026, 9)} placeholder="Pick a day"/><Label scale={scale}>Expedition range</Label><DatePicker scale={scale} mode="range" captionLayout="dropdown" startMonth={new Date(2020, 0)} endMonth={new Date(2030, 11)} selected={range} onSelect={setRange} defaultMonth={new Date(2026, 9)} placeholder="Pick a range"/><DatePicker scale={scale} mode="single" disabled placeholder="Unavailable"/></div>; }
export default Demo;
