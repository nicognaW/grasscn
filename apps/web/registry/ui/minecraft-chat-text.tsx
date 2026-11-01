"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps, type MinecraftRenderProp } from "./minecraft-render";
import * as React from "react";
import { minecraftGlyphs } from "./minecraft-font";
import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";
import { minecraftChatAtlas } from "./minecraft-chat-atlas";
import { disclosureAdvance } from "./minecraft-disclosure-metrics";
import "./minecraft-label.css";
const advance = (char: string) => minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ?? getUnihexGlyph(char)?.advance ?? disclosureAdvance(char) ?? 6;
const textWidth = (text: string) => Math.ceil(Array.from(text).reduce((width, char) => width + advance(char), 0));
function splitLines(text: string, width?: number) {
    const lines: string[] = [];
    for (let remaining of text.split("\n")) {
        while (width != null && textWidth(remaining) > width) {
            const chars = Array.from(remaining);
            let used = 0, count = 0, space = -1;
            while (count < chars.length) {
                if (chars[count] === " ")
                    space = count;
                if (used + advance(chars[count]) > width && count > 0)
                    break;
                used += advance(chars[count++]);
            }
            const end = space < 0 ? Math.max(1, count) : space;
            lines.push(chars.slice(0, end).join(""));
            remaining = chars.slice(end + Number(space >= 0)).join("");
        }
        lines.push(remaining);
    }
    return lines;
}
type MinecraftChatTextProps = React.HTMLAttributes<HTMLElement> & {
    render?: MinecraftRenderProp;
    ref?: React.Ref<HTMLElement>;
    as?: keyof React.JSX.IntrinsicElements;
    clipWidth?: number;
    scale?: 1 | 2 | 3;
    maxWidth?: number;
    align?: "left" | "center";
};
function MinecraftChatText({ children, className, scale = 2, maxWidth, align = "left", as = "span", render, clipWidth, style, ref, ...props }: MinecraftChatTextProps) {
    const node = React.useRef<HTMLElement>(null);
    React.useImperativeHandle(ref, () => node.current!, []);
    const [fontReady, setFontReady] = React.useState(false);
    const [containerWidth, setContainerWidth] = React.useState<number>();
    const child = null;
    const content = children;
    const accessibleText = typeof content === "string" || typeof content === "number" ? String(content) : null;
    let text = accessibleText;
    if (text != null && clipWidth != null && clipWidth > 0)
        text = text.split("\n").map(line => {
            if (textWidth(line) <= clipWidth)
                return line;
            let value = "", used = 0;
            for (const char of Array.from(line)) {
                const next = advance(char);
                if (used + next > clipWidth - textWidth("..."))
                    break;
                value += char;
                used += next;
            }
            return value + "...";
        }).join("\n");
    const unicode = text != null && /[^\x00-\x7f]/.test(text);
    React.useLayoutEffect(() => {
        if (unicode) {
            let live = true;
            loadUnihex().then(() => {
                if (live)
                    setFontReady(true);
            });
            return () => { live = false; };
        }
    }, [unicode]);
    React.useLayoutEffect(() => {
        const element = node.current!;
        const update = () => {
            const width = Math.floor(element.clientWidth / scale);
            if (width > 0)
                setContainerWidth(width);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, [scale]);
    const supported = text != null && (!unicode || fontReady) && Array.from(text).every(char => char === "\n" || /^[\x20-\x7e]$/.test(char) || getUnihexGlyph(char));
    const lines = text == null ? [] : splitLines(text, maxWidth);
    const widest = Math.max(0, ...lines.map(textWidth));
    const width = containerWidth ?? maxWidth ?? widest;
    const richText = (value: React.ReactNode): React.ReactNode => {
        if (typeof value === "string" || typeof value === "number")
            return <MinecraftChatText scale={scale} style={{ color: "inherit", textShadow: "inherit" }}>{value}</MinecraftChatText>;
        if (Array.isArray(value))
            return value.map((child, index) => <React.Fragment key={index}>{richText(child)}</React.Fragment>);
        if (React.isValidElement<{
            children?: React.ReactNode;
        }>(value) && (value.type === React.Fragment || typeof value.type === "string" && ["span", "a", "strong", "em", "b", "i", "u", "s", "small", "code", "mark", "abbr", "sub", "sup"].includes(value.type)))
            return React.cloneElement(value, undefined, richText(value.props.children));
        return value;
    };
    const rendered = text != null ? <>{lines.map((line, index) => <span aria-hidden="true" className="mc-label-line" key={index} style={{ paddingLeft: align === "center" ? (Math.floor((width - widest) / 2) + Math.floor(widest / 2) - Math.floor(textWidth(line) / 2)) * scale : 0 }}>
      {supported ? <MinecraftColorUnicodeLabel text={line} atlas={minecraftChatAtlas}/> : line}
    </span>)}<span className="mc-text-accessible">{accessibleText}</span></> : accessibleText == null ? <span className="mc-chat-rich-inline">{richText(content)}</span> : content;
    const Component = MinecraftRender;
    return <Component as={as} render={render} ref={node} data-slot="minecraft-prose" data-mc-label-layout-ready={!unicode || fontReady} className={cn(`mc-label ${""}`, className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, width: maxWidth == null ? undefined : maxWidth * scale, ...__style } as React.CSSProperties))} {...props}>
    {rendered}
  </Component>;
}
export { MinecraftChatText };
export type { MinecraftChatTextProps };
