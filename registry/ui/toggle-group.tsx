"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { toggleVariants } from "./toggle";
import { playMinecraftClick } from "./minecraft-sound";
import "./minecraft-toggle-group.css";
type Appearance = {
    scale?: 1 | 2 | 3;
    variant?: "default";
    size?: "default";
};
type ToggleGroupProps = MinecraftProps<typeof ToggleGroupPrimitive> & Appearance & {
    spacing?: number;
};
type ToggleGroupItemProps = MinecraftProps<typeof TogglePrimitive> & Appearance;
const AppearanceContext = React.createContext<Appearance & {
    disabled?: boolean;
}>({ scale: 2, variant: "default", size: "default" });
function ToggleGroup({ scale = 2, variant = "default", size = "default", spacing = 2, className, style, children, disabled, ...props }: ToggleGroupProps) {
    if (variant !== "default" || size !== "default")
        throw new Error("Minecraft recipe filters support the default visual variant and size only");
    return <AppearanceContext.Provider value={{ scale, variant, size, disabled }}><ToggleGroupPrimitive data-slot="toggle-group" disabled={disabled} className={cn(`mc-toggle-group ${""}`, className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, "--mc-toggle-spacing": spacing, ...__style } as React.CSSProperties))} {...props}>{children}</ToggleGroupPrimitive></AppearanceContext.Provider>;
}
function ToggleGroupItem({ scale, variant, size, className, style, disabled, onClick, onPointerDown, ...props }: ToggleGroupItemProps) {
    const inherited = React.useContext(AppearanceContext), resolvedScale = scale ?? inherited.scale, resolvedVariant = variant ?? inherited.variant ?? "default", resolvedSize = size ?? inherited.size ?? "default", resolvedDisabled = disabled || inherited.disabled;
    if (resolvedVariant !== "default" || resolvedSize !== "default")
        throw new Error("Minecraft recipe filters support the default visual variant and size only");
    return <TogglePrimitive data-slot="toggle-group-item" disabled={resolvedDisabled} className={cn(toggleVariants({ variant: resolvedVariant, size: resolvedSize }), className)} style={minecraftStyle(style, __style => ({ "--mc-scale": resolvedScale, ...__style } as React.CSSProperties))} {...props} aria-disabled={resolvedDisabled ? true : props["aria-disabled"]} onPointerDown={event => {
            if (resolvedDisabled || event.currentTarget.hasAttribute("data-disabled")) {
                event.preventDefault();
                return;
            }
            ;
            onPointerDown?.(event);
        }} onClick={event => {
            if (resolvedDisabled || event.currentTarget.hasAttribute("data-disabled") || event.currentTarget.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }
            ;
            onClick?.(event);
            if (!event.defaultPrevented && !event.baseUIHandlerPrevented)
                playMinecraftClick();
        }}/>;
}
export { ToggleGroup, ToggleGroupItem };
export type { ToggleGroupProps, ToggleGroupItemProps };
