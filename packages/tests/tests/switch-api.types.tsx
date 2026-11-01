import * as React from "react";
import { Switch } from "../../../apps/web/registry/ui/switch";
const ref = React.createRef<HTMLButtonElement>();
const valid = <Switch ref={ref} scale={3} size="default" name="mode" value="enabled" required checked onCheckedChange={() => { }} aria-label="Mode"/>;
const composed = <Switch render={<button />}>{undefined}</Switch>;
// @ts-expect-error The native on/off button has no small visual variant.
const small = <Switch size="sm"/>;
// @ts-expect-error Native GUI scales are integers1-3.
const fractional = <Switch scale={1.5}/>;
void [valid, composed, small, fractional];
