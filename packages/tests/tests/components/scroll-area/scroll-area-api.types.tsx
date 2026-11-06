import { ScrollArea, ScrollBar } from "@grasscn/web/ui/scroll-area";

const vertical = <ScrollBar orientation="vertical" />;

// @ts-expect-error No native horizontal scrollbar has been established.
const horizontal = <ScrollBar orientation="horizontal" />;

// @ts-expect-error Vanilla scrollbars remain visible while content overflows.
const hoverOnly = <ScrollArea type="hover" />;

export const ScrollAreaApiContract = function ScrollAreaApiContract() {
  const supported = (
    <ScrollArea scale={3} viewportRef={{ current: null }} type="auto">
      <p>Content</p>
    </ScrollArea>
  );

  const composed = <ScrollArea render={<section />}>Content</ScrollArea>;

  return [supported, composed, vertical, horizontal, hoverOnly];
};
