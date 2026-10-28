// Source: https://ui.shadcn.com/r/styles/new-york-v4/button.json (MIT)
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import "./minecraft-button.css"
import { minecraftGlyphs } from "./minecraft-font"

function bitmapText(content: React.ReactNode): React.ReactNode {
  if (Array.isArray(content)) return content.map((child, index) => <React.Fragment key={index}>{bitmapText(child)}</React.Fragment>)
  if (typeof content !== "string" && typeof content !== "number") return content
  const text = String(content)
  if (!/^[\x20-\x7e]*$/.test(text)) return content
  return <span className="mc-text">
    <span className="mc-text-pixels" aria-hidden="true">
      {Array.from(text, (char, index) => {
        const [x, y, advance] = minecraftGlyphs[char.charCodeAt(0) - 32]
        return <span key={index} className="mc-glyph" style={{
          "--mc-glyph-x": x, "--mc-glyph-y": y, "--mc-advance": advance,
          visibility: char === " " ? "hidden" : undefined,
        } as React.CSSProperties} />
      })}
    </span>
    <span className="mc-text-accessible">{text}</span>
  </span>
}

const webButtonClasses = "gap-2 rounded-md text-sm font-medium transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "mc-button",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    compoundVariants: [
      { variant: ["destructive", "outline", "secondary", "ghost", "link"], className: webButtonClasses },
      { variant: ["destructive", "outline", "secondary", "ghost", "link"], size: "default", className: "h-9 px-4 py-2 has-[>svg]:px-3" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  scale = 2,
  style,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    scale?: 1 | 2 | 3
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const skin = (content: React.ReactNode) => variant === "default" ? <>
    <span className="mc-button-surface" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
    </span>
    <span className="mc-button-label">{bitmapText(content)}</span>
  </> : content
  const content = asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
    ? React.cloneElement(children, {}, skin(children.props.children))
    : skin(children)

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={{ "--mc-scale": scale, ...style } as React.CSSProperties}
      {...props}
    >{content}</Comp>
  )
}

export { Button, buttonVariants }


