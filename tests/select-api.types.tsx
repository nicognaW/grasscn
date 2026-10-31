import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from "../registry/ui/select";
const trigger = React.createRef<HTMLButtonElement>(), content = React.createRef<HTMLDivElement>(), item = React.createRef<HTMLDivElement>();
const valid = <Select name="mode" required value="survival" onValueChange={() => { }} scale={3}><SelectTrigger ref={trigger} size="default" aria-label="Mode"><SelectValue placeholder="Choose"/></SelectTrigger><SelectContent ref={content} alignItemWithTrigger={false} sideOffset={4}><SelectGroup><SelectLabel>Modes</SelectLabel><SelectItem ref={item} value="survival" label="Survival">Survival</SelectItem><SelectItem value="creative" disabled>Creative</SelectItem><SelectSeparator /></SelectGroup><SelectScrollUpButton /><SelectScrollDownButton /></SelectContent></Select>;
// @ts-expect-error Minecraft has no small cycle-button visual variant.
const small = <SelectTrigger size="sm"/>;
// @ts-expect-error Native pixels require supported integer GUI scales.
const fractional = <Select scale={1.5}/>;
void [valid, small, fractional];
