"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import * as React from "react";
import { ContextMenu as Primitive } from "@base-ui/react/context-menu";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { Separator } from "./separator";
import { playMinecraftClick } from "./minecraft-sound";
import { MenuScaleContext, MinecraftMenuText, menuTextNodes } from "./minecraft-menu-text";
import { MinecraftMenuCheckboxSprite } from "./minecraft-menu-checkbox";
import "./minecraft-checkbox.css";
import "./minecraft-menu.css";
type MenuSurface = "popup" | "suggestions";
function ContextMenu({ scale = 2, ...props }: MinecraftProps<typeof Primitive.Root> & {
    scale?: 1 | 2 | 3;
}) {
    return <MenuScaleContext.Provider value={scale}><Primitive.Root {...props}/></MenuScaleContext.Provider>;
}
function ContextMenuPortal(props: MinecraftProps<typeof Primitive.Portal>) { return <Primitive.Portal data-slot="context-menu-portal" {...props}/>; }
function ContextMenuTrigger(props: MinecraftProps<typeof Primitive.Trigger>) {
    return <Primitive.Trigger data-slot="context-menu-trigger" {...props}/>;
}
function useMenuFrame(ref: React.Ref<HTMLDivElement> | undefined, scale: number, surface: MenuSurface) {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
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
        const items = Array.from(node.children).find(child => child.classList.contains("mc-menu-items")) as HTMLElement | undefined;
        if (!items)
            return;
        let frame = 0;
        const measure = () => {
            if (!node.clientWidth || !node.clientHeight)
                return;
            node.dataset.mcMenuScrollable = String(node.scrollHeight > node.clientHeight + .5);
            const style = getComputedStyle(node), padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            const maximum = Math.max(0, node.scrollHeight - node.clientHeight);
            node.dataset.mcMenuAbove = String(node.scrollTop > .5);
            node.dataset.mcMenuBelow = String(node.scrollTop < maximum - .5);
            const values = { "--mc-menu-scroll-px": `${node.scrollTop}px`, "--mc-menu-frame-height": `${node.clientHeight}px`, "--mc-menu-frame-width": `${node.clientWidth}px`, "--mc-menu-clip-top": `${node.scrollTop}px`, "--mc-menu-clip-bottom": `${Math.max(0, items.offsetHeight - node.scrollTop - (node.clientHeight - padding))}px` };
            for (const [key, value] of Object.entries(values))
                if (node.style.getPropertyValue(key) !== value)
                    node.style.setProperty(key, value);
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => { node.dataset.mcMenuReady = "true"; });
        };
        const resize = new ResizeObserver(measure), mutation = new MutationObserver(measure);
        resize.observe(node);
        resize.observe(items);
        mutation.observe(items, { subtree: true, childList: true, characterData: true });
        node.addEventListener("scroll", measure, { passive: true });
        window.addEventListener("resize", measure);
        measure();
        return () => { resize.disconnect(); mutation.disconnect(); node.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); cancelAnimationFrame(frame); };
    }, [node, scale, surface]);
    return forwarded;
}
function contentChildren(children: React.ReactNode, render: unknown, surface: MenuSurface) {
    const child = null;
    const content = <>{surface === "popup" && <span className="mc-menu-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite}/></span>}<div className="mc-menu-items">{children}</div><span className="mc-menu-scroll-hint" data-edge="top" aria-hidden="true"/><span className="mc-menu-scroll-hint" data-edge="bottom" aria-hidden="true"/></>;
    return content;
}
type ContextMenuContentProps = (MinecraftProps<typeof Primitive.Popup> & (Pick<MinecraftProps<typeof Primitive.Positioner>, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding" | "collisionBoundary" | "collisionAvoidance"> & {
    keepMounted?: boolean;
})) & {
    scale?: 1 | 2 | 3;
    surface?: MenuSurface;
};
function ContextMenuContent({ children, className, scale: explicitScale, surface = "popup", render, style, ref, side = "right", align = "start", sideOffset, alignOffset, collisionPadding, collisionBoundary, collisionAvoidance, keepMounted, ...props }: ContextMenuContentProps) {
    const inherited = React.useContext(MenuScaleContext), scale = explicitScale ?? inherited;
    const forwarded = useMenuFrame(ref, scale, surface);
    return <Primitive.Portal keepMounted={keepMounted}><MenuScaleContext.Provider value={scale}><Primitive.Positioner data-mc-positioner="" style={{ zIndex: 50 }} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={collisionPadding} collisionBoundary={collisionBoundary} collisionAvoidance={collisionAvoidance}><Primitive.Popup render={render} data-slot="context-menu-content" data-surface={surface} ref={forwarded} className={cn("mc-menu-content", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{contentChildren(children, render, surface)}</Primitive.Popup></Primitive.Positioner></MenuScaleContext.Provider></Primitive.Portal>;
}
function ContextMenuGroup(props: MinecraftProps<typeof Primitive.Group>) { return <Primitive.Group data-slot="context-menu-group" {...props}/>; }
function rowChildren(children: React.ReactNode, _render: unknown, before?: React.ReactNode, after?: React.ReactNode) { return <>{before}{menuTextNodes(children)}{after}</>; }
;
type ContextMenuItemProps = MinecraftProps<typeof Primitive.Item> & {
    inset?: boolean;
    variant?: "default";
};
function ContextMenuItem({ children, className, inset, variant = "default", render, style, ...props }: ContextMenuItemProps) {
    const scale = React.useContext(MenuScaleContext);
    if (variant !== "default")
        throw new Error("Minecraft menu items support the default visual variant only");
    return <Primitive.Item render={render} data-slot="context-menu-item" data-inset={inset} className={cn("mc-menu-item", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{rowChildren(children, render)}</Primitive.Item>;
}
function checkboxIcon(scale: 1 | 2 | 3, radio = false) {
    const Indicator = radio ? Primitive.RadioItemIndicator : Primitive.CheckboxItemIndicator;
    return <Indicator keepMounted aria-hidden="true" className="mc-checkbox mc-menu-check" style={{ "--mc-scale": scale, "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`, "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`, "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`, "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})` } as React.CSSProperties}><MinecraftMenuCheckboxSprite /><span className="mc-checkbox-indicator"/></Indicator>;
}
function ContextMenuCheckboxItem({ children, className, render, style, onCheckedChange, ...props }: MinecraftProps<typeof Primitive.CheckboxItem>) {
    const scale = React.useContext(MenuScaleContext);
    return <Primitive.CheckboxItem render={render} data-slot="context-menu-checkbox-item" className={cn("mc-menu-item mc-menu-checkbox-item", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} onCheckedChange={(next, details) => {
            onCheckedChange?.(next, details);
            if (!props.disabled)
                playMinecraftClick();
        }} {...props}>{rowChildren(children, render, checkboxIcon(scale))}</Primitive.CheckboxItem>;
}
function ContextMenuRadioGroup(props: MinecraftProps<typeof Primitive.RadioGroup>) { return <Primitive.RadioGroup data-slot="context-menu-radio-group" {...props}/>; }
function ContextMenuRadioItem({ children, className, render, style, onClick, ...props }: MinecraftProps<typeof Primitive.RadioItem>) {
    const scale = React.useContext(MenuScaleContext);
    return <Primitive.RadioItem render={render} data-slot="context-menu-radio-item" className={cn("mc-menu-item mc-menu-checkbox-item", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} onClick={event => {
            onClick?.(event);
            if (!props.disabled)
                playMinecraftClick();
        }} {...props}>{rowChildren(children, render, checkboxIcon(scale, true))}</Primitive.RadioItem>;
}
function ContextMenuLabel({ children, className, inset, render, style, ...props }: MinecraftProps<typeof Primitive.GroupLabel> & {
    inset?: boolean;
}) {
    const scale = React.useContext(MenuScaleContext);
    return <Primitive.GroupLabel render={render} data-slot="context-menu-label" data-inset={inset} className={cn("mc-menu-item mc-menu-label", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{rowChildren(children, render)}</Primitive.GroupLabel>;
}
function ContextMenuSeparator({ className, style, render, children, ...props }: MinecraftProps<typeof Primitive.Separator>) {
    const scale = React.useContext(MenuScaleContext);
    return <Primitive.Separator render={render} data-slot="context-menu-separator" className={cn("mc-menu-separator", className)} style={style} {...props}>{render ? children : <Separator scale={scale} role="separator"/>}</Primitive.Separator>;
}
function ContextMenuShortcut({ children, className, ...props }: MinecraftProps<"span">) { return <span data-slot="context-menu-shortcut" className={cn("mc-menu-shortcut", className)} {...props}>{menuTextNodes(children)}</span>; }
function ContextMenuSub(props: MinecraftProps<typeof Primitive.SubmenuRoot>) { return <Primitive.SubmenuRoot data-slot="context-menu-sub" {...props}/>; }
function ContextMenuSubTrigger({ children, className, inset, render, style, ...props }: MinecraftProps<typeof Primitive.SubmenuTrigger> & {
    inset?: boolean;
}) {
    const scale = React.useContext(MenuScaleContext);
    const arrow = <span className="mc-menu-arrow" aria-hidden="true"><span className="mc-menu-arrow-ltr"><MinecraftMenuText>{">"}</MinecraftMenuText></span><span className="mc-menu-arrow-rtl"><MinecraftMenuText>{"<"}</MinecraftMenuText></span></span>;
    return <Primitive.SubmenuTrigger render={render} data-slot="context-menu-sub-trigger" data-inset={inset} className={cn("mc-menu-item mc-menu-sub-trigger", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{rowChildren(children, render, undefined, arrow)}</Primitive.SubmenuTrigger>;
}
type ContextMenuSubContentProps = (MinecraftProps<typeof Primitive.Popup> & (Pick<MinecraftProps<typeof Primitive.Positioner>, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding" | "collisionBoundary" | "collisionAvoidance"> & {
    keepMounted?: boolean;
})) & {
    scale?: 1 | 2 | 3;
    surface?: MenuSurface;
};
function ContextMenuSubContent({ children, className, scale: explicitScale, surface = "popup", render, style, ref, side = "right", align = "start", sideOffset, alignOffset, collisionPadding, collisionBoundary, collisionAvoidance, keepMounted, ...props }: ContextMenuSubContentProps) {
    const inherited = React.useContext(MenuScaleContext), scale = explicitScale ?? inherited;
    const forwarded = useMenuFrame(ref, scale, surface);
    return <MenuScaleContext.Provider value={scale}><Primitive.Positioner data-mc-positioner="" style={{ zIndex: 50 }} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={collisionPadding} collisionBoundary={collisionBoundary} collisionAvoidance={collisionAvoidance}><Primitive.Popup render={render} data-slot="context-menu-sub-content" data-surface={surface} ref={forwarded} className={cn("mc-menu-content", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{contentChildren(children, render, surface)}</Primitive.Popup></Primitive.Positioner></MenuScaleContext.Provider>;
}
export { ContextMenu, ContextMenuPortal, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup, ContextMenuLabel, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent };
export type { ContextMenuContentProps, ContextMenuItemProps, ContextMenuSubContentProps };
