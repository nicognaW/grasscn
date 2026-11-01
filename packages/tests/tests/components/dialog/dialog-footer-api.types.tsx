import * as React from "react";
import { DialogFooter } from "@grasscn/web/ui/dialog";
const ref = React.createRef<HTMLDivElement>();
export const api = <><DialogFooter ref={ref} showCloseButton className="native-footer" data-passed="yes"><button>Existing action</button></DialogFooter><DialogFooter showCloseButton={false}/><DialogFooter showCloseButton={undefined}/></>;
