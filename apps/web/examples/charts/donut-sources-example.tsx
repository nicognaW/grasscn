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
    aria-label="Acquisition analytics"
    type="donut"
    data={data}
    series={["visitors"]}
    config={config}
    scale={1}
  />
);

export default Example;
