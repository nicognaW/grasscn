import * as React from "react"
import { RadioGroup, RadioGroupItem } from "../registry/ui/radio-group"
const root = React.createRef<HTMLDivElement>(), item = React.createRef<HTMLButtonElement>()
const valid = <RadioGroup ref={root} scale={3} name="mode" required value="survival" onValueChange={() => {}} orientation="horizontal" dir="rtl" loop={false}><RadioGroupItem ref={item} value="survival" /><RadioGroupItem value="creative" disabled /></RadioGroup>
const composition = <RadioGroup asChild><fieldset><RadioGroupItem asChild value="survival"><button /></RadioGroupItem></fieldset></RadioGroup>
// @ts-expect-error Item values are required by the radio-group API.
const missing = <RadioGroupItem />
// @ts-expect-error Only integer native GUI scales are supported.
const fractional = <RadioGroup scale={1.5} />
void [valid, composition, missing, fractional]
