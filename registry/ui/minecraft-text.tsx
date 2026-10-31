import { minecraftClasses as cn } from "./minecraft-render";
import * as React from "react";
import { minecraftGlyphs } from "./minecraft-font";
import "./minecraft-text.css";
function MinecraftText({ children, className }: {
    children: React.ReactNode;
    className?: string;
}) {
    if ((typeof children !== "string" && typeof children !== "number") || !/^[\x20-\x7e]*$/.test(String(children)))
        return <span className={className}>{children}</span>;
    const text = String(children);
    return <span className={cn(`mc-bitmap ${""}`, className)}>
    <span className="mc-text-pixels" aria-hidden="true">{Array.from(text, (char, index) => {
            const [x, y, advance] = minecraftGlyphs[char.charCodeAt(0) - 32];
            return <span key={index} className="mc-glyph" style={{ "--mc-glyph-x": x, "--mc-glyph-y": y, "--mc-advance": advance, visibility: char === " " ? "hidden" : undefined } as React.CSSProperties}/>;
        })}</span>
    <span className="mc-text-accessible">{text}</span>
  </span>;
}
export { MinecraftText };
