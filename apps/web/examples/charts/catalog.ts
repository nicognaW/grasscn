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
  "area-sources-example": {
    Component: Example11,
    description: "How visitors discover your website.",
    filename: "charts/area-sources-example.tsx",
    title: "Traffic sources",
  },
  "area-visitors-example": {
    Component: Example10,
    description: "Desktop and mobile traffic over six months.",
    filename: "charts/area-visitors-example.tsx",
    title: "Website visitors",
  },
  "bar-sources-example": {
    Component: Example5,
    description: "How visitors discover your website.",
    filename: "charts/bar-sources-example.tsx",
    title: "Traffic sources",
  },
  "bar-visitors-example": {
    Component: Example4,
    description: "Desktop and mobile traffic over six months.",
    filename: "charts/bar-visitors-example.tsx",
    title: "Website visitors",
  },
  "donut-sources-example": {
    Component: Example15,
    description: "How visitors discover your website.",
    filename: "charts/donut-sources-example.tsx",
    title: "Traffic sources",
  },
  "donut-visitors-example": {
    Component: Example14,
    description: "A comparison of browser usage.",
    filename: "charts/donut-visitors-example.tsx",
    title: "Browser visitors",
  },
  "fps-example": {
    Component: Example1,
    description: "Rendering performance across a sequence of frames.",
    filename: "charts/fps-example.tsx",
    title: "Frame timing",
  },
  "line-sources-example": {
    Component: Example9,
    description: "How visitors discover your website.",
    filename: "charts/line-sources-example.tsx",
    title: "Traffic sources",
  },
  "line-visitors-example": {
    Component: Example8,
    description: "Desktop and mobile traffic over six months.",
    filename: "charts/line-visitors-example.tsx",
    title: "Website visitors",
  },
  "metric-example": {
    Component: Example0,
    description: "Response latency across the latest requests.",
    filename: "charts/metric-example.tsx",
    title: "API response time",
  },
  "pie-sources-example": {
    Component: Example13,
    description: "How visitors discover your website.",
    filename: "charts/pie-sources-example.tsx",
    title: "Traffic sources",
  },
  "pie-visitors-example": {
    Component: Example12,
    description: "A comparison of browser usage.",
    filename: "charts/pie-visitors-example.tsx",
    title: "Browser visitors",
  },
  "profiler-example": {
    Component: Example3,
    description: "Visitor distribution by browser.",
    filename: "charts/profiler-example.tsx",
    title: "Browser share",
  },
  "radar-sources-example": {
    Component: Example17,
    description: "How visitors discover your website.",
    filename: "charts/radar-sources-example.tsx",
    title: "Traffic sources",
  },
  "radar-visitors-example": {
    Component: Example16,
    description: "Desktop and mobile traffic over six months.",
    filename: "charts/radar-visitors-example.tsx",
    title: "Website visitors",
  },
  "radial-sources-example": {
    Component: Example19,
    description: "How visitors discover your website.",
    filename: "charts/radial-sources-example.tsx",
    title: "Traffic sources",
  },
  "radial-visitors-example": {
    Component: Example18,
    description: "A comparison of browser usage.",
    filename: "charts/radial-visitors-example.tsx",
    title: "Browser visitors",
  },
  "request-volume-example": {
    Component: Example2,
    description: "Incoming requests per minute.",
    filename: "charts/request-volume-example.tsx",
    title: "Request volume",
  },
  "stacked-bar-sources-example": {
    Component: Example7,
    description: "How visitors discover your website.",
    filename: "charts/stacked-bar-sources-example.tsx",
    title: "Traffic sources",
  },
  "stacked-bar-visitors-example": {
    Component: Example6,
    description: "Desktop and mobile traffic over six months.",
    filename: "charts/stacked-bar-visitors-example.tsx",
    title: "Website visitors",
  },
} satisfies Record<string, ExampleDefinition>;
