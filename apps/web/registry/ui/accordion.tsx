"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import * as React from "react";
import { Accordion as Primitive } from "@base-ui/react/accordion";
import { Button } from "./button";
import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import "./minecraft-accordion.css";
const ScaleContext = React.createContext<1 | 2 | 3>(2);
type AccordionProps<Value = string> = MinecraftProps<typeof Primitive.Root<Value>> & {
    scale?: 1 | 2 | 3;
};
function Accordion<Value = string>({ scale = 2, className, style, ...props }: AccordionProps<Value>) {
    return <ScaleContext.Provider value={scale}><Primitive.Root data-slot="accordion" className={cn("mc-accordion", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}/></ScaleContext.Provider>;
}
function AccordionItem({ className, ...props }: MinecraftProps<typeof Primitive.Item>) { return <Primitive.Item data-slot="accordion-item" className={cn("mc-accordion-item", className)} {...props}/>; }
function AccordionTrigger({ children, render, className, onClick, ...props }: MinecraftProps<typeof Primitive.Trigger>) {
    const scale = React.useContext(ScaleContext);
    return <Primitive.Header className="mc-accordion-header"><Primitive.Trigger render={render ?? <Button scale={scale}/>} data-slot="accordion-trigger" className={cn("mc-accordion-trigger", className)} onClick={event => {
            onClick?.(event);
            if (event.currentTarget.getAttribute("aria-disabled") === "true")
                event.preventDefault();
        }} {...props}>{children}</Primitive.Trigger></Primitive.Header>;
}
type AccordionContentProps = MinecraftProps<typeof Primitive.Panel> & {
    scale?: 1 | 2 | 3;
    maxWidth?: number;
    align?: "left" | "center";
    wrap?: boolean;
};
function AccordionContent({ children, className, ref, style, scale: explicitScale, maxWidth, align = "left", wrap = true, ...props }: AccordionContentProps) {
    const inherited = React.useContext(ScaleContext), scale = explicitScale ?? inherited, [element, setElement] = React.useState<HTMLDivElement | null>(null), [width, setWidth] = React.useState<number>();
    const forwarded = React.useCallback((node: HTMLDivElement | null) => {
        setElement(node);
        if (typeof ref === "function") {
            const cleanup = ref(node);
            if (typeof cleanup === "function")
                return () => { setElement(null); cleanup(); };
        }
        else if (ref)
            ref.current = node;
    }, [ref]);
    React.useLayoutEffect(() => {
        if (!element)
            return;
        const measure = () => { const computed = getComputedStyle(element); setWidth(Math.max(1, Math.floor((element.clientWidth - parseFloat(computed.paddingLeft) - parseFloat(computed.paddingRight)) / scale))); element.dataset.mcDisclosureReady = "true"; };
        const resize = new ResizeObserver(measure);
        resize.observe(element);
        measure();
        return () => resize.disconnect();
    }, [element, scale]);
    const scalar = typeof children === "string" || typeof children === "number";
    return <Primitive.Panel ref={forwarded} data-slot="accordion-content" className={cn("mc-accordion-content", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{scalar ? <MinecraftDisclosureText scale={scale} maxWidth={maxWidth ?? (wrap ? width : undefined)} align={align} style={{ width: "100%" }}>{children}</MinecraftDisclosureText> : children}</Primitive.Panel>;
}
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
export type { AccordionProps, AccordionContentProps };
