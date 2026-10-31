import { ScrollArea, ScrollBar } from "../registry/ui/scroll-area"

export function ScrollAreaApiContract() {
  const supported = <ScrollArea scale={3} viewportRef={{ current: null }} type="auto"><p>Content</p></ScrollArea>
  const composed = <ScrollArea asChild><section>Content</section></ScrollArea>
  const vertical = <ScrollBar orientation="vertical" />
  // @ts-expect-error No native horizontal scrollbar has been established.
  const horizontal = <ScrollBar orientation="horizontal" />
  // @ts-expect-error Vanilla scrollbars remain visible while content overflows.
  const hoverOnly = <ScrollArea type="hover" />
  return [supported, composed, vertical, horizontal, hoverOnly]
}
