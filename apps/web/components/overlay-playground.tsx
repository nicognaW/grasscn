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

import "./documentation.css";

const playgrounds = {
  tooltip: Demo0,
  dialog: Demo1,
  "alert-dialog": Demo2,
  popover: Demo3,
  "dropdown-menu": Demo4,
  "context-menu": Demo5,
  menubar: Demo6,
  sheet: Demo7,
  drawer: Demo8,
  command: Demo9,
  avatar: Demo10,
  table: Demo11,
  calendar: Demo12,
  "date-picker": Demo13,
  item: Demo14,
  "data-table": Demo15,
  carousel: Demo16,
  message: Demo17,
  bubble: Demo17,
  "message-scroller": Demo17,
  attachment: Demo18,
  chart: Demo19,
};
export function OverlayPlayground({
  name,
}: {
  name: keyof typeof playgrounds;
}) {
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
