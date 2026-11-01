import type { ExampleDefinition } from "../definition";
import Example2 from "./alert-dialog-example";
import Example22 from "./attachment-example";
import Example10 from "./avatar-example";
import Example20 from "./bubble-example";
import Example12 from "./calendar-example";
import Example18 from "./carousel-example";
import Example9 from "./command-example";
import Example5 from "./context-menu-example";
import Example16 from "./data-table-example";
import Example17 from "./data-table-features-example";
import Example13 from "./date-picker-example";
import Example14 from "./date-picker-range-example";
import Example1 from "./dialog-example";
import Example8 from "./drawer-example";
import Example4 from "./dropdown-menu-example";
import Example15 from "./item-example";
import Example6 from "./menubar-example";
import Example19 from "./message-example";
import Example21 from "./message-scroller-example";
import Example3 from "./popover-example";
import Example7 from "./sheet-example";
import Example11 from "./table-example";
import Example0 from "./tooltip-example";

export const overlayExamples = {
  "tooltip-example": {
    Component: Example0,
    filename: "overlays/tooltip-example.tsx",
    title: "Tooltip",
  },
  "dialog-example": {
    Component: Example1,
    filename: "overlays/dialog-example.tsx",
    title: "Dialog",
  },
  "alert-dialog-example": {
    Component: Example2,
    filename: "overlays/alert-dialog-example.tsx",
    title: "Alert Dialog",
  },
  "popover-example": {
    Component: Example3,
    filename: "overlays/popover-example.tsx",
    title: "Popover",
  },
  "dropdown-menu-example": {
    Component: Example4,
    filename: "overlays/dropdown-menu-example.tsx",
    title: "Dropdown Menu",
  },
  "context-menu-example": {
    Component: Example5,
    filename: "overlays/context-menu-example.tsx",
    title: "Context Menu",
  },
  "menubar-example": {
    Component: Example6,
    filename: "overlays/menubar-example.tsx",
    title: "Menubar",
  },
  "sheet-example": {
    Component: Example7,
    filename: "overlays/sheet-example.tsx",
    title: "Sheet",
  },
  "drawer-example": {
    Component: Example8,
    filename: "overlays/drawer-example.tsx",
    title: "Drawer",
  },
  "command-example": {
    Component: Example9,
    filename: "overlays/command-example.tsx",
    title: "Command",
  },
  "avatar-example": {
    Component: Example10,
    filename: "overlays/avatar-example.tsx",
    title: "Avatar",
  },
  "table-example": {
    Component: Example11,
    filename: "overlays/table-example.tsx",
    title: "Table",
  },
  "calendar-example": {
    Component: Example12,
    filename: "overlays/calendar-example.tsx",
    title: "Calendar",
  },
  "date-picker-example": {
    Component: Example13,
    filename: "overlays/date-picker-example.tsx",
    title: "Date Picker",
  },
  "date-picker-range-example": {
    Component: Example14,
    filename: "overlays/date-picker-range-example.tsx",
    title: "Date Picker Range",
  },
  "item-example": {
    Component: Example15,
    filename: "overlays/item-example.tsx",
    title: "Item",
  },
  "data-table-example": {
    Component: Example16,
    filename: "overlays/data-table-example.tsx",
    title: "Data Table",
  },
  "data-table-features-example": {
    Component: Example17,
    filename: "overlays/data-table-features-example.tsx",
    title: "Data Table Features",
  },
  "carousel-example": {
    Component: Example18,
    filename: "overlays/carousel-example.tsx",
    title: "Carousel",
  },
  "message-example": {
    Component: Example19,
    filename: "overlays/message-example.tsx",
    title: "Message",
  },
  "bubble-example": {
    Component: Example20,
    filename: "overlays/bubble-example.tsx",
    title: "Bubble",
  },
  "message-scroller-example": {
    Component: Example21,
    filename: "overlays/message-scroller-example.tsx",
    title: "Message Scroller",
  },
  "attachment-example": {
    Component: Example22,
    filename: "overlays/attachment-example.tsx",
    title: "Attachment",
  },
} satisfies Record<string, ExampleDefinition>;
