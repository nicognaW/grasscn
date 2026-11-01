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
  card: CardDemo,
  separator: SeparatorDemo,
  "scroll-area": ScrollAreaDemo,
  progress: ProgressDemo,
  tabs: TabsDemo,
  collapsible: CollapsibleDemo,
  "aspect-ratio": AspectRatioDemo,
  "button-group": ButtonGroupDemo,
  pagination: PaginationDemo,
  badge: BadgeDemo,
  typography: TypographyDemo,
  breadcrumb: BreadcrumbDemo,
  kbd: KbdDemo,
  empty: EmptyDemo,
  resizable: ResizableDemo,
  sidebar: SidebarDemo,
  spinner: SpinnerDemo,
  "code-block": CodeBlockDemo,
  sonner: SonnerPlayground,
  marker: MarkerDemo,
  trace: TraceDemo,
};

export function LayoutPlayground({ name }: { name: keyof typeof playgrounds }) {
  const Playground = playgrounds[name];
  return (
    <section
      className="documentation-playground minecraft-example"
      aria-label={`Interactive ${name} playground`}
    >
      <Playground scale={2} />
    </section>
  );
}
