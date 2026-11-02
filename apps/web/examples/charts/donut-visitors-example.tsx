"use client";

import { AnalyticsChartExample } from "@/components/chart-analytics";

const data = [
  {
    name: "Chrome",
    visitors: 275,
  },
  {
    name: "Safari",
    visitors: 200,
  },
  {
    name: "Firefox",
    visitors: 187,
  },
  {
    name: "Edge",
    visitors: 173,
  },
  {
    name: "Other",
    visitors: 90,
  },
];

const config = {
  desktop: {
    color: "#55ff55",
    label: "Desktop",
  },
  mobile: {
    color: "#55ffff",
    label: "Mobile",
  },
  visitors: {
    color: "#aaffaa",
    label: "Visitors",
  },
};

const Example = () => (
  <AnalyticsChartExample
    aria-label="Website visitor analytics"
    type="donut"
    data={data}
    series={["visitors"]}
    config={config}
    scale={1}
  />
);

export default Example;
