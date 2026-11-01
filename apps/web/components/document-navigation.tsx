"use client"

import type { Node, Root } from "fumadocs-core/page-tree"
import type { TOCItemType } from "fumadocs-core/toc"
import Link from "next/link"
import { useState } from "react"
import { Button } from "../registry/ui/button"
import { MinecraftText } from "../registry/ui/minecraft-text"

function TreeNodes({ nodes, currentUrl, onNavigate }: { nodes: Node[]; currentUrl: string; onNavigate: () => void }) {
  return <ul>{nodes.map((node, index) => {
    if (node.type === "separator") return <li key={node.$id ?? index} className="minecraft-nav-heading"><MinecraftText>{node.name}</MinecraftText></li>
    if (node.type === "folder") return <li key={node.$id ?? index}>
      {node.index ? <Button nativeButton={false} render={<Link href={node.index.url} role="link" aria-current={currentUrl === node.index.url ? "page" : undefined} onClick={onNavigate} />} scale={1}>{node.name}</Button> : <span className="minecraft-nav-heading"><MinecraftText>{node.name}</MinecraftText></span>}
      <TreeNodes nodes={node.children} currentUrl={currentUrl} onNavigate={onNavigate} />
    </li>
    return <li key={node.url}><Button nativeButton={false} render={<Link href={node.url} role="link" aria-current={currentUrl === node.url ? "page" : undefined} onClick={onNavigate} />} scale={1}>{node.name}</Button></li>
  })}</ul>
}

export function DocumentationNavigation({ tree, currentUrl }: { tree: Root; currentUrl: string }) {
  const [open, setOpen] = useState(false)
  return <aside className="minecraft-docs-sidebar">
    <Button className="minecraft-docs-mobile-toggle" scale={1} aria-expanded={open} aria-controls="documentation-tree" onClick={() => setOpen(!open)}>Browse documentation</Button>
    <nav id="documentation-tree" aria-label="Documentation" data-mobile-open={open}><TreeNodes nodes={tree.children} currentUrl={currentUrl} onNavigate={() => setOpen(false)} /></nav>
  </aside>
}

export function TableOfContents({ items }: { items: TOCItemType[] }) {
  if (!items.length) return null
  return <aside className="minecraft-docs-toc"><nav aria-label="On this page"><MinecraftText>On this page</MinecraftText><ul>{items.map(item => <li key={item.url} data-depth={item.depth}>
    <Button nativeButton={false} render={<a href={item.url} role="link" />} scale={1}>{item.title}</Button>
  </li>)}</ul></nav></aside>
}
