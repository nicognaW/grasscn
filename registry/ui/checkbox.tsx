import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import "./minecraft-checkbox.css"
import { playMinecraftClick } from "./minecraft-sound"

function Checkbox({ className, scale = 2, style, onClick, ...props }:
  React.ComponentProps<typeof CheckboxPrimitive.Root> & { scale?: 1 | 2 | 3 }) {
  return <CheckboxPrimitive.Root
    data-slot="checkbox"
    className={cn("peer mc-checkbox", className)}
    style={{ "--mc-scale": scale,
      "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`,
      "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`,
      "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`,
      "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})`,
      ...style } as React.CSSProperties}
    {...props}
    onClick={event => { onClick?.(event); if (!event.defaultPrevented && !props.disabled) playMinecraftClick() }}
  >
    <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="mc-checkbox-indicator" aria-hidden="true" />
  </CheckboxPrimitive.Root>
}

export { Checkbox }
