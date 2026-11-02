"use client";

import Demo2 from "../demos/alert-dialog";
import Demo18 from "../demos/attachment";
import Demo10 from "../demos/avatar";
import Demo12 from "../demos/calendar";
import Demo16 from "../demos/carousel";
import Demo19 from "../demos/chart";
import Demo9 from "../demos/command";
import Demo5 from "../demos/context-menu";
import Demo15 from "../demos/data-table";
import Demo13 from "../demos/date-picker";
import Demo1 from "../demos/dialog";
import Demo8 from "../demos/drawer";
import Demo4 from "../demos/dropdown-menu";
import Demo14 from "../demos/item";
import Demo6 from "../demos/menubar";
import Demo17 from "../demos/message";
import Demo3 from "../demos/popover";
import Demo7 from "../demos/sheet";
import Demo11 from "../demos/table";
import Demo0 from "../demos/tooltip";
import BubbleExample from "../examples/overlays/bubble-example";

import "./documentation.css";

const playgrounds = {
  "alert-dialog": Demo2,
  attachment: Demo18,
  avatar: Demo10,
  bubble: BubbleExample,
  calendar: Demo12,
  carousel: Demo16,
  chart: Demo19,
  command: Demo9,
  "context-menu": Demo5,
  "data-table": Demo15,
  "date-picker": Demo13,
  dialog: Demo1,
  drawer: Demo8,
  "dropdown-menu": Demo4,
  item: Demo14,
  menubar: Demo6,
  message: Demo17,
  "message-scroller": Demo17,
  popover: Demo3,
  sheet: Demo7,
  table: Demo11,
  tooltip: Demo0,
};

export const OverlayPlayground = ({
  name,
}: {
  name: keyof typeof playgrounds;
}) => {
  const Playground = playgrounds[name];

  return (
    <section
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-playground minecraft-example"
      /* eslint-enable shadcn/no-unknown-classes */
      aria-label={`Interactive ${name} playground`}
    >
      <Playground scale={2} />
    </section>
  );
};
