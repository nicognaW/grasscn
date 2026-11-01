import * as React from "react";

import { minecraftStyle } from "./minecraft-render";

/** Unskinned layout; original pixel artwork belongs to its children. */
const AspectRatio = ({
  ratio = 1,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  ratio?: number;
}) => (
  <div
    data-slot="aspect-ratio"
    style={minecraftStyle(style, (__style) => ({
      aspectRatio: ratio,
      ...__style,
    }))}
    {...props}
  />
);

export { AspectRatio };
