"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { MinecraftText } from "../registry/ui/minecraft-text"

export function DocumentLink({ children, href = "#", ...props }: ComponentProps<"a">) {
  return <Link href={href} {...props}><MinecraftText>{children}</MinecraftText></Link>
}
