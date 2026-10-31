"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { MinecraftText } from "./minecraft-text"
import { playMinecraftClick } from "./minecraft-sound"
import "./minecraft-button.css"
import "./minecraft-switch.css"

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & { scale?: 1 | 2 | 3; size?: "default" }
function Switch({ className, scale = 2, size = "default", style, children, asChild, disabled, onClick, onPointerDown, ...props }: SwitchProps) {
  if (size !== "default") throw new Error("Minecraft on/off buttons support the default visual size only")
  const child = asChild ? React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }> : null
  const artwork = <>
    <span className="mc-button-surface" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</span>
    <span className="mc-button-label" aria-hidden="true"><span className="mc-switch-on"><MinecraftText>ON</MinecraftText></span><span className="mc-switch-off"><MinecraftText>OFF</MinecraftText></span></span>
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className="mc-switch-thumb" aria-hidden="true" />
  </>
  return <SwitchPrimitive.Root data-slot="switch" data-size={size} asChild={asChild} disabled={disabled} className={`mc-button mc-switch ${className ?? ""}`} style={{ "--mc-scale": scale, ...style } as React.CSSProperties}
    {...props} aria-disabled={disabled ? true : props["aria-disabled"]}
    onPointerDown={event => { if (disabled) { event.preventDefault(); return }; onPointerDown?.(event) }}
    onClick={event => { if (disabled || event.currentTarget.hasAttribute("data-disabled") || event.currentTarget.getAttribute("aria-disabled") === "true") { event.preventDefault(); return }; onClick?.(event); if (!event.defaultPrevented) playMinecraftClick() }}>
    {child ? React.cloneElement(child, undefined, child.props.children, artwork) : <>{children}{artwork}</>}
  </SwitchPrimitive.Root>
}

export { Switch }
export type { SwitchProps }
