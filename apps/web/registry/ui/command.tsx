"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { attachMinecraftInput } from "./minecraft-input-paint";
import "./minecraft-input.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./dialog";
import { Button } from "./button";
import { Separator } from "./separator";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { MenuScaleContext, MinecraftMenuText, menuTextNodes } from "./minecraft-menu-text";
import "./minecraft-menu.css";
import "./minecraft-command.css";
type Scale = 1 | 2 | 3;
function Command({ scale = 2, className, style, ...props }: MinecraftProps<typeof CommandPrimitive> & {
    scale?: Scale;
}) {
    return <MenuScaleContext.Provider value={scale}><CommandPrimitive data-slot="command" className={cn(`mc-command ${""}`, className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}/></MenuScaleContext.Provider>;
}
function CommandDialog({ title = "Command Palette", description = "Search for a command to run...", children, className, showCloseButton = true, scale = 2, ...props }: Omit<MinecraftProps<typeof Dialog>, "children"> & {
    children?: React.ReactNode;
    title?: string;
    description?: string;
    className?: string;
    showCloseButton?: boolean;
    scale?: Scale;
}) {
    const wasOpen = React.useRef(false), restoreFocus = React.useRef<HTMLElement | null>(null), isOpen = Boolean(props.open ?? props.defaultOpen);
    if (isOpen && !wasOpen.current && typeof document !== "undefined")
        restoreFocus.current = document.activeElement as HTMLElement;
    wasOpen.current = isOpen;
    return <Dialog scale={scale} {...props}><DialogContent className={cn(`mc-command-dialog ${""}`, className)} finalFocus={() => {
            if (restoreFocus.current?.isConnected) {
                return restoreFocus.current;
            }
        }}><DialogHeader className="mc-command-dialog-heading"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><Command scale={scale} data-mc-dialog-item="true">{children}</Command>{showCloseButton && <DialogClose render={<Button scale={scale}/>}>Done</DialogClose>}</DialogContent></Dialog>;
}
function CommandInput({ className, scale: explicit, ref, style, ...props }: React.ComponentProps<typeof CommandPrimitive.Input> & {
    scale?: Scale;
}) {
    const inherited = React.useContext(MenuScaleContext), scale = explicit ?? inherited;
    const node = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => node.current!, []);
    React.useEffect(() => node.current ? attachMinecraftInput(node.current, scale) : undefined, [scale]);
    return <CommandPrimitive.Input ref={node} data-slot="command-input" spellCheck={false} autoCorrect="off" className={cn("mc-input mc-command-input", className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}/>;
}
function CommandList({ className, ref, children, style, surface = "suggestions", ...props }: React.ComponentProps<typeof CommandPrimitive.List> & {
    surface?: "suggestions" | "popup";
}) {
    const scale = React.useContext(MenuScaleContext), node = React.useRef<HTMLDivElement>(null);
    const child = null;
    React.useImperativeHandle(ref, () => node.current!, []);
    React.useLayoutEffect(() => {
        const element = node.current!, items = element.querySelector<HTMLElement>('[data-mc-command-items]');
        if (!items)
            return;
        let frame = 0;
        const measure = () => {
            if (!element.clientWidth || !element.clientHeight)
                return;
            const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
            element.dataset.mcMenuScrollable = String(maximum > .5);
            element.dataset.mcMenuAbove = String(element.scrollTop > .5);
            element.dataset.mcMenuBelow = String(element.scrollTop < maximum - .5);
            const padding = parseFloat(getComputedStyle(element).paddingTop) + parseFloat(getComputedStyle(element).paddingBottom);
            for (const [key, value] of Object.entries({ "--mc-menu-scroll-px": `${element.scrollTop}px`, "--mc-menu-frame-height": `${element.clientHeight}px`, "--mc-menu-clip-top": `${element.scrollTop}px`, "--mc-menu-clip-bottom": `${Math.max(0, items.offsetHeight - element.scrollTop - (element.clientHeight - padding))}px` }))
                if (element.style.getPropertyValue(key) !== value)
                    element.style.setProperty(key, value);
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => { element.dataset.mcMenuReady = 'true'; });
        };
        const resize = new ResizeObserver(measure), mutation = new MutationObserver(measure);
        resize.observe(element);
        resize.observe(items);
        mutation.observe(items, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
        element.addEventListener('scroll', measure, { passive: true });
        measure();
        return () => { resize.disconnect(); mutation.disconnect(); element.removeEventListener('scroll', measure); cancelAnimationFrame(frame); };
    }, [scale, surface]);
    const contents = <>{surface === "popup" && <span className="mc-menu-background" aria-hidden="true"><MinecraftSurface sprite={minecraftCardSprite}/></span>}<div className="mc-menu-items" data-mc-command-items="">{children}</div><span className="mc-menu-scroll-hint" data-edge="top" aria-hidden="true"/><span className="mc-menu-scroll-hint" data-edge="bottom" aria-hidden="true"/></>;
    return <CommandPrimitive.List data-slot="command-list" data-surface={surface} ref={node} className={cn(`mc-menu-content mc-command-list ${""}`, className)} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props}>{contents}</CommandPrimitive.List>;
}
function CommandEmpty({ children, className, ...props }: MinecraftProps<typeof CommandPrimitive.Empty>) { return <CommandPrimitive.Empty data-slot="command-empty" className={cn(`mc-command-empty ${""}`, className)} {...props}>{menuTextNodes(children)}</CommandPrimitive.Empty>; }
function CommandGroup({ heading, className, ...props }: MinecraftProps<typeof CommandPrimitive.Group>) { return <CommandPrimitive.Group data-slot="command-group" className={cn(`mc-command-group ${""}`, className)} heading={heading == null ? undefined : <MinecraftMenuText>{heading}</MinecraftMenuText>} {...props}/>; }
function CommandItem({ children, className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
    return <CommandPrimitive.Item data-slot="command-item" className={cn("mc-command-item", className)} {...props}>{menuTextNodes(children)}</CommandPrimitive.Item>;
}
function CommandSeparator({ className, children, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) { const scale = React.useContext(MenuScaleContext); return <CommandPrimitive.Separator data-slot="command-separator" {...props}><Separator scale={scale} className={cn("mc-command-separator", className)}/>{children}</CommandPrimitive.Separator>; }
function CommandShortcut({ children, className, ...props }: MinecraftProps<'span'>) { return <span data-slot="command-shortcut" className={cn(`mc-command-shortcut ${""}`, className)} {...props}>{menuTextNodes(children)}</span>; }
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator };
