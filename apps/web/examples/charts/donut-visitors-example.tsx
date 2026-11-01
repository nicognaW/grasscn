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
    label: "Desktop",
    color: "#55ff55",
  },
  mobile: {
    label: "Mobile",
    color: "#55ffff",
  },
  visitors: {
    label: "Visitors",
    color: "#aaffaa",
  },
};

export default function Example() {
  return (
    <AnalyticsChartExample
      aria-label="Website visitor analytics"
      type="donut"
      data={data}
      series={["visitors"]}
      config={config}
      scale={1}
    />
  );
}
