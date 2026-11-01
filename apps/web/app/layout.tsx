import type { Metadata } from "next"
import type { ReactNode } from "react"
import { SiteFrame } from "../components/site-frame"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "grasscn", template: "%s · grasscn" },
  description: "Pixel-perfect Minecraft UI. shadcn components. Yours to build.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><SiteFrame>{children}</SiteFrame></body></html>
}
