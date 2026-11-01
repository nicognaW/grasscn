"use client";

import { AnalyticsChartExample } from "@/components/chart-analytics";

const data = [
  {
    name: "Direct",
    visitors: 310,
  },
  {
    name: "Search",
    visitors: 450,
  },
  {
    name: "Social",
    visitors: 180,
  },
  {
    name: "Referral",
    visitors: 120,
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
      aria-label="Acquisition analytics"
      type="stacked-bar"
      data={data}
      series={["visitors"]}
      config={config}
      scale={1}
    />
  );
}
