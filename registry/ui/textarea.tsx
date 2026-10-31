"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { attachMinecraftTextarea } from "./minecraft-textarea-paint"
import "./minecraft-textarea.css"

function Textarea({ className, scale = 2, style, ref, ...props }: React.ComponentProps<"textarea"> & { scale?: 1 | 2 | 3 }) {
  const node = React.useRef<HTMLTextAreaElement>(null)
  React.useImperativeHandle(ref, () => node.current!, [])
  React.useEffect(() => node.current ? attachMinecraftTextarea(node.current, scale) : undefined, [scale])
  return <textarea ref={node} data-slot="textarea" spellCheck={false} autoCorrect="off" className={cn("mc-textarea", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props} />
}
export { Textarea }
