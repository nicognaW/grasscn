"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { playMinecraftClick } from "./minecraft-sound"
import "./minecraft-radio-group.css"

const RadioContext = React.createContext<{ scale: 1 | 2 | 3; disabled: boolean }>({ scale: 2, disabled: false })
function RadioGroup({ className, scale = 2, disabled = false, style, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root> & { scale?: 1 | 2 | 3 }) {
  return <RadioContext.Provider value={{ scale, disabled }}><RadioGroupPrimitive.Root disabled={disabled} data-slot="radio-group" className={`mc-radio-group ${className ?? ""}`} style={{ "--mc-scale": scale, ...style } as React.CSSProperties} {...props} /></RadioContext.Provider>
}
function RadioGroupItem({ className, scale: explicitScale, style, disabled: itemDisabled = false, onClick, onPointerDown, children, asChild, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item> & { scale?: 1 | 2 | 3 }) {
  const context = React.useContext(RadioContext), scale = explicitScale ?? context.scale, disabled = itemDisabled || context.disabled
  const child = asChild ? React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }> : null
  const indicator = <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="mc-radio-indicator" aria-hidden="true" />
  return <RadioGroupPrimitive.Item data-slot="radio-group-item" asChild={asChild} className={`mc-checkbox mc-radio-item ${className ?? ""}`}
    style={{ "--mc-scale": scale, "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`, "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`, "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`, "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})`, ...style } as React.CSSProperties}
    {...props} disabled={disabled} aria-disabled={disabled ? true : props["aria-disabled"]} onPointerDown={event => { if (disabled) { event.preventDefault(); return }; onPointerDown?.(event) }} onClick={event => { if (disabled || event.currentTarget.hasAttribute("data-disabled") || event.currentTarget.getAttribute("aria-disabled") === "true" || (event.currentTarget as HTMLButtonElement).disabled) { event.preventDefault(); return }; onClick?.(event); if (!event.defaultPrevented) playMinecraftClick() }}>
    {child ? React.cloneElement(child, undefined, child.props.children, indicator) : <>{children}{indicator}</>}
  </RadioGroupPrimitive.Item>
}

export { RadioGroup, RadioGroupItem }
