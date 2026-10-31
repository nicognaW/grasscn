"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import * as React from "react";
import { cva } from "class-variance-authority";
import { NavigationMenu as Primitive } from "@base-ui/react/navigation-menu";
import { minecraftTabsAssets as assets } from "./minecraft-tabs-assets";
import { minecraftGlyphs } from "./minecraft-font";
import { MinecraftText } from "./minecraft-text";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";
import { tabsUnihexAtlas } from "./minecraft-tabs-atlas";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { CardScaleContext } from "./minecraft-card-text";
import { PopoverTextContext, MinecraftPopoverText } from "./minecraft-popover-text";
import { MinecraftMenuText, MenuScaleContext, menuTextNodes } from "./minecraft-menu-text";
import { playMinecraftClick } from "./minecraft-sound";
import "./minecraft-card.css";
import "./minecraft-menu.css";
import "./minecraft-navigation-menu.css";
const ScaleContext = React.createContext<1 | 2 | 3>(2);
const PanelContext = React.createContext(false);
function useLocalRef<T extends HTMLElement>(forwarded: React.Ref<T> | undefined) {
    const local = React.useRef<T>(null);
    const [element, setElement] = React.useState<T | null>(null);
    const callback = React.useCallback((node: T | null) => {
        local.current = node;
        setElement(node);
        if (typeof forwarded === "function") {
            const cleanup = forwarded(node);
            if (typeof cleanup === "function")
                return () => { local.current = null; setElement(null); cleanup(); };
        }
        else if (forwarded)
            forwarded.current = node;
    }, [forwarded]);
    return [local, callback, element] as const;
}
function NavigationMenu({ scale = 2, className, style, children, align = "start", ...props }: MinecraftProps<typeof Primitive.Root> & {
    scale?: 1 | 2 | 3;
    align?: Primitive.Positioner.Props["align"];
}) { return <ScaleContext.Provider value={scale}><MenuScaleContext.Provider value={scale}><Primitive.Root data-slot="navigation-menu" className={cn("mc-navigation-menu", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{children}<NavigationMenuPositioner align={align}/></Primitive.Root></MenuScaleContext.Provider></ScaleContext.Provider>; }
function NavigationMenuList({ className, style, ref, ...props }: MinecraftProps<typeof Primitive.List>) {
    const scale = React.useContext(ScaleContext), [, forwarded, element] = useLocalRef(ref);
    React.useLayoutEffect(() => {
        if (!element)
            return;
        const measure = () => {
            const width = Math.floor(element.clientWidth / scale), count = Math.max(1, element.querySelectorAll(':scope > [data-slot="navigation-menu-item"]').length);
            const available = Math.max(0, Math.min(400, width) - 28), tabWidth = Math.ceil(Math.floor(available / count) / 2) * 2, left = Math.ceil(Math.floor((width - available) / 2) / 2) * 2;
            element.style.setProperty("--mc-tab-width", `${tabWidth * scale}px`);
            element.style.setProperty("--mc-tabs-left", `${left * scale}px`);
            element.style.setProperty("--mc-tabs-end", `${(left + tabWidth * count) * scale}px`);
            element.dataset.mcTabsReady = "true";
        };
        measure();
        const resize = new ResizeObserver(measure), mutation = new MutationObserver(measure);
        resize.observe(element);
        mutation.observe(element, { childList: true });
        return () => { resize.disconnect(); mutation.disconnect(); };
    }, [element, scale]);
    return <Primitive.List ref={forwarded} data-slot="navigation-menu-list" className={cn("mc-navigation-list", className)} style={minecraftStyle(style, __style => ({ "--mc-tab-header": assets.textures.header_separator, ...__style } as React.CSSProperties))} {...props}/>;
}
function NavigationMenuItem({ className, ...props }: MinecraftProps<typeof Primitive.Item>) { return <Primitive.Item data-slot="navigation-menu-item" className={cn("mc-navigation-item", className)} {...props}/>; }
const navigationMenuTriggerStyle = cva("mc-navigation-tab");
function TabSurface({ name }: {
    name: keyof typeof assets.sprites;
}) {
    return <span className="mc-tab-surface" data-sprite={name} aria-hidden="true">{assets.sprites[name].pieces.map((image, index) => <i key={index} style={{ backgroundImage: image }}/>)}</span>;
}
function useArtwork<T extends HTMLElement>(children: React.ReactNode, render: unknown, ref: React.Ref<T> | undefined) {
    const scale = React.useContext(ScaleContext), [, forwarded, element] = useLocalRef<T>(ref);
    let content = children;
    const text = typeof content === "string" || typeof content === "number" ? String(content) : null;
    React.useLayoutEffect(() => {
        let frame = 0, cancelled = false;
        if (!element)
            return;
        const update = () => {
            const width = Math.floor(element.clientWidth / scale);
            const textWidth = text == null ? Math.ceil((element.querySelector<HTMLElement>(".mc-tabs-rich")?.getBoundingClientRect().width ?? 0) / scale) : Math.ceil(Array.from(text).reduce((sum, char) => sum + (minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ?? getUnihexGlyph(char)?.advance ?? 6), 0));
            const overflow = textWidth - (width - 2);
            let left = Math.floor(width / 2) - Math.floor(textWidth / 2);
            if (overflow > 0) {
                const seconds = Date.now() / 1000, period = Math.max(overflow * .5, 3);
                const phase = Math.sin(Math.PI / 2 * Math.cos(Math.PI * 2 * seconds / period)) / 2 + .5;
                left = 1 - Math.trunc(phase * overflow);
            }
            const underline = Math.min(textWidth, width - 4);
            element.style.setProperty("--mc-tab-label-x", `${(left - 1) * scale}px`);
            element.style.setProperty("--mc-tab-underline-x", `${Math.floor((width - underline) / 2) * scale}px`);
            element.style.setProperty("--mc-tab-underline-width", `${underline * scale}px`);
            element.dataset.mcTabReady = "true";
            if (!cancelled)
                frame = requestAnimationFrame(update);
        };
        const unicode = text != null && /[^\x00-\x7f]/.test(text);
        if (unicode)
            loadUnihex().then(() => {
                if (!cancelled)
                    update();
            });
        else
            update();
        return () => { cancelled = true; cancelAnimationFrame(frame); };
    }, [text, scale, element]);
    const artwork = <>
    <TabSurface name="tab"/><TabSurface name="tab_highlighted"/><TabSurface name="tab_selected"/><TabSurface name="tab_selected_highlighted"/>
    <span className="mc-tab-menu" aria-hidden="true" style={{ backgroundImage: assets.textures.menu_background }}/>
    <span className="mc-tab-underline" aria-hidden="true"/>
    <span className="mc-tab-label-window"><span className="mc-tab-label">{text == null ? <span className="mc-tabs-rich">{content}</span> : /^[\x20-\x7e]*$/.test(text) ? <MinecraftText>{text}</MinecraftText> : <MinecraftUnicodeLabel text={text} atlas={tabsUnihexAtlas}/>}</span></span>
  </>;
    const requested = React.useRef(false), expiry = React.useRef(0);
    React.useLayoutEffect(() => {
        if (!element)
            return;
        let previous = element.hasAttribute("data-popup-open") || element.hasAttribute("data-active");
        const observer = new MutationObserver(() => {
            const next = element.hasAttribute("data-popup-open") || element.hasAttribute("data-active");
            if (next !== previous) {
                if (requested.current)
                    playMinecraftClick();
                requested.current = false;
                previous = next;
            }
        });
        observer.observe(element, { attributes: true, attributeFilter: ["data-popup-open", "data-active"] });
        return () => { observer.disconnect(); cancelAnimationFrame(expiry.current); };
    }, [element]);
    const requestClickSound = () => { requested.current = true; cancelAnimationFrame(expiry.current); expiry.current = requestAnimationFrame(() => { requested.current = false; }); };
    return { forwarded, artwork, requestClickSound };
}
function NavigationMenuTrigger({ children, render, className, ref, onClick, ...props }: MinecraftProps<typeof Primitive.Trigger>) {
    const { forwarded, artwork, requestClickSound } = useArtwork(children, render, ref);
    return <Primitive.Trigger render={render} ref={forwarded as React.Ref<HTMLButtonElement>} data-slot="navigation-menu-trigger" className={cn(navigationMenuTriggerStyle(), className)} onClick={event => {
            onClick?.(event);
            if (!event.defaultPrevented && !props.disabled && !event.currentTarget.classList.contains("mc-button"))
                requestClickSound();
        }} {...props}>{artwork}</Primitive.Trigger>;
}
function NavigationMenuLink({ children, render, className, active, ref, onClick, onFocus, onBlur, onPointerEnter, onPointerLeave, ...props }: MinecraftProps<typeof Primitive.Link>) {
    const panel = React.useContext(PanelContext), tab = !panel || (typeof className === "string" && className.split(/\s+/).includes("mc-navigation-tab")), [hover, setHover] = React.useState(false), [focused, setFocused] = React.useState(false);
    const { forwarded, artwork, requestClickSound } = useArtwork(children, render, ref);
    const child = null;
    const content = tab ? artwork : menuTextNodes(children);
    return <Primitive.Link render={render} ref={forwarded as React.Ref<HTMLAnchorElement>} data-slot="navigation-menu-link" data-open={active ? "" : undefined} data-highlighted={active || hover || focused ? "" : undefined} active={active} className={cn(tab ? navigationMenuTriggerStyle() : "mc-menu-item", className)} onClick={event => {
            onClick?.(event);
            if (tab && !event.defaultPrevented && props["aria-disabled"] !== true && props["aria-disabled"] !== "true" && !event.currentTarget.classList.contains("mc-button"))
                requestClickSound();
        }} onFocus={e => {
            onFocus?.(e);
            if (!e.defaultPrevented)
                setFocused(true);
        }} onBlur={e => { onBlur?.(e); setFocused(false); }} onPointerEnter={e => {
            onPointerEnter?.(e);
            if (!e.defaultPrevented)
                setHover(true);
        }} onPointerLeave={e => { onPointerLeave?.(e); setHover(false); }} {...props}>{content}</Primitive.Link>;
}
function navigationText(children: React.ReactNode, bold = false): React.ReactNode {
    return React.Children.map(children, child => {
        if (typeof child === "string" || typeof child === "number")
            return <MinecraftPopoverText bold={bold}>{child}</MinecraftPopoverText>;
        if (!React.isValidElement<{
            children?: React.ReactNode;
        }>(child) || typeof child.type !== "string" && child.type !== React.Fragment)
            return child;
        const nodes = React.Children.toArray(child.props.children), scalar = nodes.some(node => typeof node === "string" || typeof node === "number"), elements = nodes.some(node => React.isValidElement(node));
        // Keep mixed inline content in its consumer-supplied layout.
        if (scalar && elements)
            return child;
        if (typeof child.type === "string" && !/^(div|section|article|header|footer|p|h[1-6]|label|li)$/.test(child.type))
            return child;
        return React.cloneElement(child, undefined, navigationText(child.props.children, typeof child.type === "string" && /^h[1-6]$/.test(child.type) || bold));
    });
}
type NavigationMenuContentProps = MinecraftProps<typeof Primitive.Content> & {
    scale?: 1 | 2 | 3;
    surface?: "popup" | "suggestions";
};
function useMenuFrame(ref: React.Ref<HTMLDivElement> | undefined, scale: number, surface: "popup" | "suggestions") {
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
function NavigationMenuContent({ children, render, className, ref, scale: explicitScale, surface = "popup", style, ...props }: NavigationMenuContentProps) {
    const inherited = React.useContext(ScaleContext), scale = explicitScale ?? inherited, [, forwarded, element] = useLocalRef(ref), [width, setWidth] = React.useState(214);
    const frameRef = useMenuFrame(forwarded, scale, surface);
    React.useLayoutEffect(() => {
        if (!element)
            return;
        let frame = 0;
        const measure = () => { const computed = getComputedStyle(element); setWidth(Math.max(1, Math.floor((element.clientWidth - parseFloat(computed.paddingLeft) - parseFloat(computed.paddingRight)) / scale))); cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { element.dataset.mcNavigationContentReady = "true"; }); };
        const resize = new ResizeObserver(measure);
        resize.observe(element);
        measure();
        return () => { resize.disconnect(); cancelAnimationFrame(frame); };
    }, [element, scale]);
    const child = null, text = children;
    const body = <>{surface === "popup" && <span className="mc-menu-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite}/></span>}<div className="mc-menu-items">{navigationText(text)}</div><span className="mc-menu-scroll-hint" data-edge="top" aria-hidden="true"/><span className="mc-menu-scroll-hint" data-edge="bottom" aria-hidden="true"/></>;
    const provided = <ScaleContext.Provider value={scale}><MenuScaleContext.Provider value={scale}><CardScaleContext.Provider value={scale}><PopoverTextContext.Provider value={{ scale, width }}><PanelContext.Provider value>{body}</PanelContext.Provider></PopoverTextContext.Provider></CardScaleContext.Provider></MenuScaleContext.Provider></ScaleContext.Provider>;
    return <Primitive.Content render={render} ref={frameRef} data-slot="navigation-menu-content" data-surface={surface} className={cn("mc-card mc-menu-content mc-navigation-content", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}>{provided}</Primitive.Content>;
}
function NavigationMenuPositioner({ className, align = "start", ...props }: MinecraftProps<typeof Primitive.Positioner>) { return <Primitive.Portal><Primitive.Positioner data-slot="navigation-menu-positioner" align={align} side="bottom" collisionPadding={8} style={{ zIndex: 50 }} {...props}><Primitive.Popup className="mc-navigation-popup"><Primitive.Viewport data-slot="navigation-menu-viewport" className={cn("mc-navigation-viewport", className)}/></Primitive.Popup></Primitive.Positioner></Primitive.Portal>; }
function NavigationMenuIndicator({ className, ref, children, ...props }: MinecraftProps<typeof Primitive.Icon>) {
    const [, forwarded, element] = useLocalRef(ref);
    React.useLayoutEffect(() => {
        if (!element)
            return;
        let frame = 0;
        const tick = () => {
            const root = element.closest('[data-slot="navigation-menu"]'), trigger = element.closest('[data-slot="navigation-menu-item"]')?.querySelector<HTMLElement>('[data-slot="navigation-menu-trigger"]');
            if (trigger) {
                const style = getComputedStyle(trigger);
                const list = root?.querySelector('[data-slot="navigation-menu-list"]');
                const offset = list ? trigger.getBoundingClientRect().left - list.getBoundingClientRect().left : 0;
                element.style.setProperty("--mc-indicator-left", `${offset + parseFloat(style.getPropertyValue("--mc-tab-underline-x") || "0")}px`);
                element.style.setProperty("--mc-indicator-width", style.getPropertyValue("--mc-tab-underline-width"));
                element.style.setProperty("--mc-indicator-ink", style.getPropertyValue("--mc-ink") || style.color);
            }
            frame = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frame);
    }, [element]);
    return <Primitive.Icon ref={forwarded} data-slot="navigation-menu-indicator" className={cn("mc-navigation-indicator", className)} {...props}>{children ?? <span aria-hidden="true"/>}</Primitive.Icon>;
}
export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuContent, NavigationMenuTrigger, NavigationMenuLink, NavigationMenuIndicator, NavigationMenuPositioner, navigationMenuTriggerStyle };
export type { NavigationMenuContentProps };
