import type { ExampleDefinition } from "../definition";
import Example11 from "./area-sources-example";
import Example10 from "./area-visitors-example";
import Example5 from "./bar-sources-example";
import Example4 from "./bar-visitors-example";
import Example15 from "./donut-sources-example";
import Example14 from "./donut-visitors-example";
import Example1 from "./fps-example";
import Example9 from "./line-sources-example";
import Example8 from "./line-visitors-example";
import Example0 from "./metric-example";
import Example13 from "./pie-sources-example";
import Example12 from "./pie-visitors-example";
import Example3 from "./profiler-example";
import Example17 from "./radar-sources-example";
import Example16 from "./radar-visitors-example";
import Example19 from "./radial-sources-example";
import Example18 from "./radial-visitors-example";
import Example2 from "./request-volume-example";
import Example7 from "./stacked-bar-sources-example";
import Example6 from "./stacked-bar-visitors-example";

export const chartExamples = {
  "metric-example": {
    Component: Example0,
    filename: "charts/metric-example.tsx",
    title: "API response time",
    description: "Response latency across the latest requests.",
  },
  "fps-example": {
    Component: Example1,
    filename: "charts/fps-example.tsx",
    title: "Frame timing",
    description: "Rendering performance across a sequence of frames.",
  },
  "request-volume-example": {
    Component: Example2,
    filename: "charts/request-volume-example.tsx",
    title: "Request volume",
    description: "Incoming requests per minute.",
  },
  "profiler-example": {
    Component: Example3,
    filename: "charts/profiler-example.tsx",
    title: "Browser share",
    description: "Visitor distribution by browser.",
  },
  "bar-visitors-example": {
    Component: Example4,
    filename: "charts/bar-visitors-example.tsx",
    title: "Website visitors",
    description: "Desktop and mobile traffic over six months.",
  },
  "bar-sources-example": {
    Component: Example5,
    filename: "charts/bar-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
  "stacked-bar-visitors-example": {
    Component: Example6,
    filename: "charts/stacked-bar-visitors-example.tsx",
    title: "Website visitors",
    description: "Desktop and mobile traffic over six months.",
  },
  "stacked-bar-sources-example": {
    Component: Example7,
    filename: "charts/stacked-bar-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
  "line-visitors-example": {
    Component: Example8,
    filename: "charts/line-visitors-example.tsx",
    title: "Website visitors",
    description: "Desktop and mobile traffic over six months.",
  },
  "line-sources-example": {
    Component: Example9,
    filename: "charts/line-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
  "area-visitors-example": {
    Component: Example10,
    filename: "charts/area-visitors-example.tsx",
    title: "Website visitors",
    description: "Desktop and mobile traffic over six months.",
  },
  "area-sources-example": {
    Component: Example11,
    filename: "charts/area-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
  "pie-visitors-example": {
    Component: Example12,
    filename: "charts/pie-visitors-example.tsx",
    title: "Browser visitors",
    description: "A comparison of browser usage.",
  },
  "pie-sources-example": {
    Component: Example13,
    filename: "charts/pie-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
  "donut-visitors-example": {
    Component: Example14,
    filename: "charts/donut-visitors-example.tsx",
    title: "Browser visitors",
    description: "A comparison of browser usage.",
  },
  "donut-sources-example": {
    Component: Example15,
    filename: "charts/donut-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
  "radar-visitors-example": {
    Component: Example16,
    filename: "charts/radar-visitors-example.tsx",
    title: "Website visitors",
    description: "Desktop and mobile traffic over six months.",
  },
  "radar-sources-example": {
    Component: Example17,
    filename: "charts/radar-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
  "radial-visitors-example": {
    Component: Example18,
    filename: "charts/radial-visitors-example.tsx",
    title: "Browser visitors",
    description: "A comparison of browser usage.",
  },
  "radial-sources-example": {
    Component: Example19,
    filename: "charts/radial-sources-example.tsx",
    title: "Traffic sources",
    description: "How visitors discover your website.",
  },
} satisfies Record<string, ExampleDefinition>;
