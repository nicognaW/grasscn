"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import "./minecraft-toggle-assets.css"
import { playMinecraftClick } from "./minecraft-sound"
import "./minecraft-toggle.css"

const toggleVariants = cva("mc-toggle", { variants: { variant: { default: "" }, size: { default: "" } }, defaultVariants: { variant: "default", size: "default" } })
type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants> & { scale?: 1 | 2 | 3 }

function Toggle({ className, variant = "default", size = "default", scale = 2, style, children, asChild, disabled, onClick, onPointerDown, ...props }: ToggleProps) {
  if (variant !== "default" || size !== "default") throw new Error("Minecraft recipe filters support the default visual variant and size only")
  const child = asChild ? React.Children.only(children) as React.ReactElement<{children?: React.ReactNode}> : null
  return <TogglePrimitive.Root data-slot="toggle" asChild={asChild} disabled={disabled}
    className={toggleVariants({variant, size, className})}
    style={{"--mc-scale":scale,...style} as React.CSSProperties}
    {...props} aria-disabled={disabled ? true : props["aria-disabled"]}
    onPointerDown={event=>{if(disabled){event.preventDefault();return};onPointerDown?.(event)}}
    onClick={event=>{if(disabled||event.currentTarget.hasAttribute("data-disabled")||event.currentTarget.getAttribute("aria-disabled")==="true"){event.preventDefault();return};onClick?.(event);if(!event.defaultPrevented)playMinecraftClick()}}>
    {child ? React.cloneElement(child,undefined,child.props.children) : children}
  </TogglePrimitive.Root>
}

export { Toggle, toggleVariants }
export type { ToggleProps }
