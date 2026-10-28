"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { attachMinecraftInput } from "./minecraft-input-paint"
import "./minecraft-input.css"

function Input({ className, type = "text", scale = 2, style, ref, ...props }:
  React.ComponentProps<"input"> & { scale?: 1 | 2 | 3 }) {
  const node = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(ref, () => node.current!, [])
  React.useEffect(() => node.current ? attachMinecraftInput(node.current, scale) : undefined, [scale])
  return <input ref={node} type={type} data-slot="input" className={cn("mc-input", className)}
    style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props} />
}
export { Input }
