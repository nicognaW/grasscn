"use client"

import * as React from "react"
import { AspectRatio as AspectRatioPrimitive } from "radix-ui"

/** Unskinned web layout; the original pixel artwork belongs to its children. */
function AspectRatio(props: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export { AspectRatio }
