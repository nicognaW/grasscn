import type { ExampleDefinition } from "../definition";
import AspectRatioExample from "./aspect-ratio-example";
import BadgeAchievements from "./badge-achievements";
import BadgeExample from "./badge-example";
import BreadcrumbExample from "./breadcrumb-example";
import ButtonGroupExample from "./button-group-example";
import CardExample from "./card-example";
import CodeBlockDiff from "./code-block-diff";
import CodeBlockExample from "./code-block-example";
import CollapsibleExample from "./collapsible-example";
import EmptyCreate from "./empty-create";
import EmptyExample from "./empty-example";
import KbdExample from "./kbd-example";
import MarkerBorder from "./marker-border";
import MarkerExample from "./marker-example";
import PaginationExample from "./pagination-example";
import ProgressExample from "./progress-example";
import ResizableExample from "./resizable-example";
import ScrollAreaExample from "./scroll-area-example";
import SeparatorExample from "./separator-example";
import SidebarExample from "./sidebar-example";
import SidebarResponsive from "./sidebar-responsive";
import SonnerExample from "./sonner-example";
import SpinnerExample from "./spinner-example";
import TabsExample from "./tabs-example";
import TraceExample from "./trace-example";
import TypographyExample from "./typography-example";

export const layoutExamples = {
  "aspect-ratio-example": {
    Component: AspectRatioExample,
    filename: "layout/aspect-ratio-example.tsx",
    title: "Aspect Ratio example",
  },
  "badge-achievements": {
    Component: BadgeAchievements,
    filename: "layout/badge-achievements.tsx",
    title: "Badge Achievements",
  },
  "badge-example": {
    Component: BadgeExample,
    filename: "layout/badge-example.tsx",
    title: "Badge example",
  },
  "breadcrumb-example": {
    Component: BreadcrumbExample,
    filename: "layout/breadcrumb-example.tsx",
    title: "Breadcrumb example",
  },
  "button-group-example": {
    Component: ButtonGroupExample,
    filename: "layout/button-group-example.tsx",
    title: "Button Group example",
  },
  "card-example": {
    Component: CardExample,
    filename: "layout/card-example.tsx",
    title: "Card example",
  },
  "code-block-diff": {
    Component: CodeBlockDiff,
    filename: "layout/code-block-diff.tsx",
    title: "Code Block Diff",
  },
  "code-block-example": {
    Component: CodeBlockExample,
    filename: "layout/code-block-example.tsx",
    title: "Code Block example",
  },
  "collapsible-example": {
    Component: CollapsibleExample,
    filename: "layout/collapsible-example.tsx",
    title: "Collapsible example",
  },
  "empty-create": {
    Component: EmptyCreate,
    filename: "layout/empty-create.tsx",
    title: "Empty Create",
  },
  "empty-example": {
    Component: EmptyExample,
    filename: "layout/empty-example.tsx",
    title: "Empty example",
  },
  "kbd-example": {
    Component: KbdExample,
    filename: "layout/kbd-example.tsx",
    title: "Kbd example",
  },
  "marker-border": {
    Component: MarkerBorder,
    filename: "layout/marker-border.tsx",
    title: "Marker Border",
  },
  "marker-example": {
    Component: MarkerExample,
    filename: "layout/marker-example.tsx",
    title: "Marker example",
  },
  "pagination-example": {
    Component: PaginationExample,
    filename: "layout/pagination-example.tsx",
    title: "Pagination example",
  },
  "progress-example": {
    Component: ProgressExample,
    filename: "layout/progress-example.tsx",
    title: "Progress example",
  },
  "resizable-example": {
    Component: ResizableExample,
    filename: "layout/resizable-example.tsx",
    title: "Resizable example",
  },
  "scroll-area-example": {
    Component: ScrollAreaExample,
    filename: "layout/scroll-area-example.tsx",
    title: "Scroll Area example",
  },
  "separator-example": {
    Component: SeparatorExample,
    filename: "layout/separator-example.tsx",
    title: "Separator example",
  },
  "sidebar-example": {
    Component: SidebarExample,
    filename: "layout/sidebar-example.tsx",
    title: "Sidebar example",
  },
  "sidebar-responsive": {
    Component: SidebarResponsive,
    filename: "layout/sidebar-responsive.tsx",
    title: "Sidebar Responsive",
  },
  "sonner-example": {
    Component: SonnerExample,
    filename: "layout/sonner-example.tsx",
    title: "Sonner example",
  },
  "spinner-example": {
    Component: SpinnerExample,
    filename: "layout/spinner-example.tsx",
    title: "Spinner example",
  },
  "tabs-example": {
    Component: TabsExample,
    filename: "layout/tabs-example.tsx",
    title: "Tabs example",
  },
  "trace-example": {
    Component: TraceExample,
    filename: "layout/trace-example.tsx",
    title: "Trace example",
  },
  "typography-example": {
    Component: TypographyExample,
    filename: "layout/typography-example.tsx",
    title: "Typography example",
  },
} satisfies Record<string, ExampleDefinition>;
