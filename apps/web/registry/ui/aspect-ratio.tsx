import { minecraftStyle } from "./minecraft-render";
import * as React from "react";
/** Unskinned layout; original pixel artwork belongs to its children. */
function AspectRatio({ ratio = 1, style, ...props }: React.ComponentProps<"div"> & {
    ratio?: number;
}) { return <div data-slot="aspect-ratio" style={minecraftStyle(style, __style => ({ aspectRatio: ratio, ...__style }))} {...props}/>; }
export { AspectRatio };
