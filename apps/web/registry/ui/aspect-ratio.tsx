import * as React from "react";

import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

/** Unskinned layout; original pixel artwork belongs to its children. */
const AspectRatio = ({
  ratio = 1,
  style,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  ratio?: number;
}) => (
  <div
    data-slot="aspect-ratio"
    className={cn("[aspect-ratio:var(--mc-aspect-ratio)]", className)}
    style={minecraftStyle(
      style,
      (__style): React.CSSProperties & { "--mc-aspect-ratio": number } => ({
        "--mc-aspect-ratio": ratio,
        ...__style,
      })
    )}
    {...props}
  />
);

export { AspectRatio };
