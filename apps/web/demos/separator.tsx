import * as React from "react";
import { Separator } from "../registry/ui/separator";
import { Button } from "../registry/ui/button";
import type { DemoProps } from "../types";
export default function SeparatorDemo({ scale }: DemoProps) {
    const [width, setWidth] = React.useState(200);
    return <>
    <div className="demo-options"><Button className="width-picker" aria-label={`Separator width: ${width} px`} onClick={() => {
            const widths = [103, 200, 257];
            setWidth(widths[(widths.indexOf(width) + 1) % widths.length]);
        }}>{`Width: ${width} px`}</Button></div>
    <div className="demo-stage" data-stage="separator">
      <div className="demo-pair"><span className="sample-caption">MENU HEADER</span><Separator scale={scale} style={{ width: width * scale }} role="separator" aria-label="Menu header separator"/></div>
      <div className="demo-pair"><span className="sample-caption">MENU FOOTER</span><Separator scale={scale} edge="footer" style={{ width: width * scale }} role="separator" aria-label="Menu footer separator"/></div>
    </div>
    <div className="demo-result"><span className="status-dot"/><output aria-label="Separator width">{width} px</output><span>Separate content and actions</span></div>
  </>;
}
