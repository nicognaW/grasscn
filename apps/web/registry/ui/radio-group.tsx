"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { playMinecraftClick } from "./minecraft-sound";
import "./minecraft-radio-group.css";
const RadioContext = React.createContext<{
    scale: 1 | 2 | 3;
    disabled: boolean;
}>({ scale: 2, disabled: false });
function RadioGroup<Value = string>({ className, scale = 2, disabled = false, style, onValueChange, onKeyDownCapture, onPointerDownCapture, ...props }: MinecraftProps<typeof RadioGroupPrimitive<Value>> & {
    scale?: 1 | 2 | 3;
}) {
    const keyboardSelection = React.useRef(false);
    return <RadioContext.Provider value={{ scale, disabled }}><RadioGroupPrimitive<Value> disabled={disabled} onPointerDownCapture={event => { keyboardSelection.current = false; onPointerDownCapture?.(event); }} onKeyDownCapture={event => { onKeyDownCapture?.(event); keyboardSelection.current = !disabled && !event.defaultPrevented && !event.baseUIHandlerPrevented && event.key.startsWith("Arrow"); }} onValueChange={(next, details) => { onValueChange?.(next, details); if (!disabled && !details.isCanceled && keyboardSelection.current)
        playMinecraftClick(); keyboardSelection.current = false; }} data-slot="radio-group" className={cn(`mc-radio-group ${""}`, className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} {...props}/></RadioContext.Provider>;
}
function RadioGroupItem({ className, scale: explicitScale, style, disabled: itemDisabled = false, onClick, onPointerDown, children, render, ...props }: MinecraftProps<typeof RadioPrimitive.Root> & {
    scale?: 1 | 2 | 3;
}) {
    const context = React.useContext(RadioContext), scale = explicitScale ?? context.scale, disabled = itemDisabled || context.disabled;
    const child = null;
    const indicator = <RadioPrimitive.Indicator data-slot="radio-group-indicator" className="mc-radio-indicator" aria-hidden="true"/>;
    return <RadioPrimitive.Root render={render} data-slot="radio-group-item" className={cn(`mc-checkbox mc-radio-item ${""}`, className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`, "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`, "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`, "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})`, ...__style } as React.CSSProperties))} {...props} disabled={disabled} aria-disabled={disabled ? true : props["aria-disabled"]} onPointerDown={event => {
            if (disabled) {
                event.preventDefault();
                return;
            }
            ;
            onPointerDown?.(event);
        }} onClick={event => {
            if (disabled || event.currentTarget.hasAttribute("data-disabled") || event.currentTarget.getAttribute("aria-disabled") === "true" || (event.currentTarget as HTMLButtonElement).disabled) {
                event.preventDefault();
                return;
            }
            ;
            onClick?.(event);
            if (!event.defaultPrevented && !event.baseUIHandlerPrevented)
                playMinecraftClick();
        }}>
    {<>{children}{indicator}</>}
  </RadioPrimitive.Root>;
}
export { RadioGroup, RadioGroupItem };
