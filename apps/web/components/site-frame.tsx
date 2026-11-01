"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "../registry/ui/button"
import { MinecraftText } from "../registry/ui/minecraft-text"

export function SiteFrame({ children }: { children: ReactNode }) {
  return <div className="minecraft-site">
    <a className="skip-link" href="#content"><MinecraftText>Skip to content</MinecraftText></a>
    <header className="minecraft-header">
      <Link href="/" aria-label="grasscn home" className="minecraft-brand"><MinecraftText>grasscn</MinecraftText></Link>
      <nav aria-label="Main navigation">
        <Button nativeButton={false} render={<Link href="/docs" />} scale={2}>Components</Button>
      </nav>
      <a className="minecraft-github" href="https://github.com/nicognaW/grasscn"><MinecraftText>GitHub</MinecraftText></a>
    </header>
    {children}
    <footer className="minecraft-footer"><MinecraftText>Minecraft UI. Yours to build.</MinecraftText></footer>
  </div>
}
