"use client";

import AspectRatioDemo from "../demos/aspect-ratio";
import BadgeDemo from "../demos/badge";
import BreadcrumbDemo from "../demos/breadcrumb";
import ButtonGroupDemo from "../demos/button-group";
import CardDemo from "../demos/card";
import CodeBlockDemo from "../demos/code-block";
import CollapsibleDemo from "../demos/collapsible";
import EmptyDemo from "../demos/empty";
import KbdDemo from "../demos/kbd";
import MarkerDemo from "../demos/marker";
import PaginationDemo from "../demos/pagination";
import ProgressDemo from "../demos/progress";
import ResizableDemo from "../demos/resizable";
import ScrollAreaDemo from "../demos/scroll-area";
import SeparatorDemo from "../demos/separator";
import SidebarDemo from "../demos/sidebar";
import SpinnerDemo from "../demos/spinner";
import TabsDemo from "../demos/tabs";
import TraceDemo from "../demos/trace";
import TypographyDemo from "../demos/typography";
import { SonnerPlayground } from "./sonner-playground";

import "./documentation.css";

const playgrounds = {
  "aspect-ratio": AspectRatioDemo,
  badge: BadgeDemo,
  breadcrumb: BreadcrumbDemo,
  "button-group": ButtonGroupDemo,
  card: CardDemo,
  "code-block": CodeBlockDemo,
  collapsible: CollapsibleDemo,
  empty: EmptyDemo,
  kbd: KbdDemo,
  marker: MarkerDemo,
  pagination: PaginationDemo,
  progress: ProgressDemo,
  resizable: ResizableDemo,
  "scroll-area": ScrollAreaDemo,
  separator: SeparatorDemo,
  sidebar: SidebarDemo,
  sonner: SonnerPlayground,
  spinner: SpinnerDemo,
  tabs: TabsDemo,
  trace: TraceDemo,
  typography: TypographyDemo,
};

export const LayoutPlayground = ({
  name,
}: {
  name: keyof typeof playgrounds;
}) => {
  const Playground = playgrounds[name];

  return (
    <section
      className="documentation-playground minecraft-example"
      aria-label={`Interactive ${name} playground`}
    >
      <Playground scale={2} />
    </section>
  );
};
