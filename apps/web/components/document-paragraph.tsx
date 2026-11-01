"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { TypographyP } from "../registry/ui/typography"

export function DocumentParagraph({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const [logicalWidth, setLogicalWidth] = useState<number>()
  useLayoutEffect(() => {
    const element = container.current!
    const measure = () => setLogicalWidth(Math.floor(element.clientWidth / 2))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div ref={container} className="minecraft-paragraph"><TypographyP maxWidth={logicalWidth}>{children}</TypographyP></div>
}
