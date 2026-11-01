"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import * as React from "react";
import { PreviewCard as Primitive } from "@base-ui/react/preview-card";
import { MinecraftText } from "./minecraft-text";
import { MinecraftSurface } from "./minecraft-surface";
import { MinecraftTooltipSurface } from "./minecraft-tooltip-paint";
import { minecraftTooltipSprites as sprites } from "./minecraft-tooltip-sprites";
import { loadUnihex } from "./minecraft-unifont";
import { HoverCardUnicodeLine } from "./minecraft-hover-card-unicode";
import { hoverCardTextWidth, hoverCardTextSupported, wrapHoverCard } from "./minecraft-hover-card-layout";
import "./minecraft-tooltip.css";
import "./minecraft-hover-card.css";
const ScaleContext = React.createContext<1 | 2 | 3>(2);
function HoverCard({ scale = 2, ...props }: MinecraftProps<typeof Primitive.Root> & {
    scale?: 1 | 2 | 3;
}) {
    return <ScaleContext.Provider value={scale}><Primitive.Root {...props}/></ScaleContext.Provider>;
}
function HoverCardTrigger({ children, className, style, render, ...props }: MinecraftProps<typeof Primitive.Trigger>) {
    const scale = React.useContext(ScaleContext);
    return <Primitive.Trigger render={render} data-slot="hover-card-trigger" className={cn("mc-hover-card-trigger", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>
    {render ? children : <MinecraftText>{children}</MinecraftText>}
  </Primitive.Trigger>;
}
type HoverCardContentProps = (MinecraftProps<typeof Primitive.Popup> & (Pick<MinecraftProps<typeof Primitive.Positioner>, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding" | "collisionBoundary" | "collisionAvoidance"> & {
    keepMounted?: boolean;
})) & {
    scale?: 1 | 2 | 3;
    maxWidth?: number;
};
function HoverCardContent({ children, className, align = "center", sideOffset = 4, scale: explicitScale, maxWidth = 170, render, style, ref, side = "bottom", alignOffset, collisionPadding, collisionBoundary, collisionAvoidance, keepMounted, ...props }: HoverCardContentProps) {
    const inherited = React.useContext(ScaleContext), scale = explicitScale ?? inherited;
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const [available, setAvailable] = React.useState(maxWidth);
    const [, loaded] = React.useReducer(n => n + 1, 0);
    const child = null;
    const value = children;
    const plain = typeof value === "string" || typeof value === "number" ? String(value) : undefined;
    const unicode = plain !== undefined && /[^\x20-\x7e\n]/.test(plain);
    React.useEffect(() => {
        let active = true;
        if (unicode)
            loadUnihex().then(() => {
                if (active)
                    loaded();
            });
        return () => { active = false; };
    }, [unicode]);
    const forwarded = React.useCallback((element: HTMLDivElement | null) => {
        setNode(element);
        if (typeof ref === "function") {
            const cleanup = ref(element);
            if (typeof cleanup === "function")
                return () => { setNode(null); cleanup(); };
        }
        else if (ref)
            ref.current = element;
    }, [ref]);
    React.useLayoutEffect(() => {
        if (!node)
            return;
        let frame = 0;
        const measure = () => {
            const physical = parseFloat(getComputedStyle(node).getPropertyValue("--available-width")) || innerWidth;
            setAvailable(Math.max(1, Math.min(maxWidth, Math.floor(physical / scale - 24))));
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => { node.dataset.mcHoverCardReady = "true"; });
        };
        const resize = new ResizeObserver(measure);
        resize.observe(node);
        window.addEventListener("resize", measure);
        measure();
        return () => { resize.disconnect(); window.removeEventListener("resize", measure); cancelAnimationFrame(frame); };
    }, [node, maxWidth, scale, plain]);
    const supported = plain !== undefined && hoverCardTextSupported(plain);
    const lines = supported ? wrapHoverCard(plain, Math.min(maxWidth, available)) : undefined;
    const width = lines ? Math.max(0, ...lines.map(hoverCardTextWidth)) + 24 : undefined;
    const height = lines ? (lines.length === 1 ? 8 : lines.length * 10) + 24 : undefined;
    const surface = width && height ? <MinecraftTooltipSurface width={width} height={height} scale={scale}/> : <><MinecraftSurface sprite={sprites.background}/><MinecraftSurface sprite={sprites.frame}/></>;
    const contents = <>{surface}{lines ? <><div className="mc-tooltip-lines mc-hover-card-pixels" aria-hidden="true">{lines.map((line, index) => <span className="mc-tooltip-line" key={index}>{/[^\x20-\x7e]/.test(line) ? <HoverCardUnicodeLine text={line} bold={false} scale={scale} width={hoverCardTextWidth(line)}/> : <MinecraftText>{line}</MinecraftText>}</span>)}</div><span className="mc-hover-card-selectable">{plain}</span></> : <div className="mc-hover-card-rich">{value}</div>}</>;
    return <Primitive.Portal keepMounted={keepMounted}><Primitive.Positioner data-mc-positioner="" style={{ zIndex: 50 }} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={collisionPadding} collisionBoundary={collisionBoundary} collisionAvoidance={collisionAvoidance}><Primitive.Popup render={render} data-slot="hover-card-content" data-mc-hover-card-text-ready={plain === undefined || supported} ref={forwarded} className={cn("mc-tooltip mc-hover-card", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, "--mc-tooltip-width": width ?? maxWidth + 24, "--mc-tooltip-height": height, "--mc-tooltip-max": maxWidth, ...__style } as React.CSSProperties))} {...props}>
    {contents}
  </Primitive.Popup></Primitive.Positioner></Primitive.Portal>;
}
export { HoverCard, HoverCardTrigger, HoverCardContent };
export type { HoverCardContentProps };
