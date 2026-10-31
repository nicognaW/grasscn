import * as React from "react"
import { minecraftTooltipSprites as sprites } from "./minecraft-tooltip-sprites"
import { MinecraftSurface } from "./minecraft-surface"
import { gpuTooltipPixels } from "./minecraft-tooltip-gpu"

function solidBackdrop(node: HTMLElement) {
  const bounds = node.getBoundingClientRect()
  const under = document.elementsFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2).find(element => !node.contains(element) && !element.hasAttribute("data-radix-popper-content-wrapper"))
  if (!under) return undefined
  const layers: number[][] = []
  for (let element: Element | null = under; element; element = element.parentElement) {
    const style = getComputedStyle(element)
    if (style.backgroundImage !== "none") return undefined
    const rgba = style.backgroundColor.match(/[\d.]+/g)?.map(Number)
    if (rgba && rgba.length >= 3) {
      const alpha = rgba[3] ?? 1
      layers.push([...rgba.slice(0, 3), alpha])
      if (alpha === 1) break
    }
  }
  const color = [255, 255, 255]
  for (const layer of layers.reverse()) for (let c = 0; c < 3; c++) color[c] = Math.round(layer[c] * layer[3] + color[c] * (1 - layer[3]))
  // Flatten only a uniform backdrop. One center sample cannot establish what
  // lies beneath the transparent padding or shadow around the native frame.
  for (const element of document.body.querySelectorAll("*")) {
    if (node.contains(element) || element.contains(node) || element === under || element.contains(under)) continue
    const box = element.getBoundingClientRect()
    if (!box.width || !box.height || box.right <= bounds.left || box.left >= bounds.right || box.bottom <= bounds.top || box.top >= bounds.bottom) continue
    const style = getComputedStyle(element)
    if (style.visibility !== "visible" || style.display === "none") continue
    const ownText = Array.from(element.childNodes).some(child => child.nodeType === Node.TEXT_NODE && child.textContent?.trim())
    const background = style.backgroundColor.match(/[\d.]+/g)?.map(Number)
    const differentColor = background && (background[3] ?? 1) > 0 && background.slice(0, 3).some((channel, index) => channel !== color[index])
    if (ownText || differentColor || style.backgroundImage !== "none" || style.boxShadow !== "none" || style.filter !== "none" || Number(style.opacity) < 1 || [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].some(value => parseFloat(value) > 0) || ["IMG", "CANVAS", "INPUT", "VIDEO", "SVG"].includes(element.tagName)) return undefined
  }
  return color
}

export function MinecraftTooltipSurface({ width, height, scale }: { width: number; height: number; scale: number }) {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [painted, setPainted] = React.useState(false)
  React.useLayoutEffect(() => {
    const node = canvas.current!, parent = node.parentElement!
    let signature = ""
    const paint = () => {
      const backdrop = solidBackdrop(parent)
      if (!backdrop) { signature = ""; setPainted(false); return }
      const bounds = parent.getBoundingClientRect()
      const next = [backdrop, bounds.x, bounds.y, innerWidth, innerHeight].join(",")
      if (next === signature) return
      signature = next
      const w = width * scale, h = height * scale
      node.width = w; node.height = h
      const pixels = gpuTooltipPixels(w, h, scale, backdrop, bounds.x, bounds.y)
      if (!pixels) { setPainted(false); return }
      node.getContext("2d")!.putImageData(new ImageData(pixels, w, h), 0, 0)
      node.dataset.mcBackdrop = backdrop.join(",")
      node.dataset.mcLocation = [bounds.x, bounds.y].join(",")
      setPainted(true)
    }
    const frame = requestAnimationFrame(paint), timer = window.setInterval(paint, 100)
    return () => { cancelAnimationFrame(frame); clearInterval(timer) }
  }, [width, height, scale])
  return <>
    {!painted && <><MinecraftSurface sprite={sprites.background} /><MinecraftSurface sprite={sprites.frame} /></>}
    <canvas ref={canvas} aria-hidden="true" data-mc-tooltip-painted={painted} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", visibility: painted ? "visible" : "hidden" }} />
  </>
}
