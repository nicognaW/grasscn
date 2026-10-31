"use client";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import * as React from "react";
import { attachMinecraftInput } from "./minecraft-input-paint";
import "./minecraft-input.css";
function Input({ className, type = "text", scale = 2, style, ref, ...props }: React.ComponentProps<"input"> & {
    scale?: 1 | 2 | 3;
}) {
    const node = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => node.current!, []);
    React.useEffect(() => node.current ? attachMinecraftInput(node.current, scale) : undefined, [scale]);
    return <InputPrimitive ref={node} type={type} data-slot="input" spellCheck={false} autoCorrect="off" className={cn("mc-input", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}/>;
}
export { Input };
