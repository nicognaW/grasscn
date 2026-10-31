"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { MinecraftDisclosureText } from "./minecraft-disclosure-text"
import { Separator } from "./separator"
import "./minecraft-button-group.css"

const buttonGroupVariants = cva("mc-button-group", {
  variants: { orientation: { horizontal: "mc-button-group-horizontal", vertical: "mc-button-group-vertical" } },
  defaultVariants: { orientation: "horizontal" },
})

function ButtonGroup({ className, orientation = "horizontal", scale = 2, style, ...props }: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants> & { scale?: 1 | 2 | 3 }) {
  return <div role="group" data-slot="button-group" data-orientation={orientation} className={buttonGroupVariants({orientation,className})} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}/>
}

function ButtonGroupText({ className, asChild = false, children, scale = 2, maxWidth, align = "left", ...props }: React.ComponentProps<"div"> & { asChild?: boolean; scale?: 1 | 2 | 3; maxWidth?:number; align?:"left"|"center" }) {
  if(asChild) return <Slot.Root data-slot="button-group-text" className={`mc-button-group-text ${className??""}`} {...props}>{children}</Slot.Root>
  return <MinecraftDisclosureText data-slot="button-group-text" className={`mc-button-group-text ${className??""}`} scale={scale} maxWidth={maxWidth} align={align} {...props}>{children}</MinecraftDisclosureText>
}

function ButtonGroupSeparator({ className, orientation = "vertical", scale = 2, decorative = true, edge = "header", style, ...props }: Omit<React.ComponentProps<typeof Separator>,"orientation"> & { orientation?: "horizontal" | "vertical" }) {
  return <div role={decorative?"none":"separator"} aria-orientation={decorative?undefined:orientation} data-slot="button-group-separator" data-orientation={orientation} className={`mc-button-group-separator ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>
    <Separator scale={scale} edge={edge} className="mc-button-group-separator-art" />
  </div>
}

export { ButtonGroup, ButtonGroupText, ButtonGroupSeparator, buttonGroupVariants }
