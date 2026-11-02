"use client";

import { AnalyticsChartExample } from "@/components/chart-analytics";

const data = [
  {
    desktop: 186,
    mobile: 80,
    name: "Jan",
  },
  {
    desktop: 305,
    mobile: 200,
    name: "Feb",
  },
  {
    desktop: 237,
    mobile: 120,
    name: "Mar",
  },
  {
    desktop: 273,
    mobile: 190,
    name: "Apr",
  },
  {
    desktop: 309,
    mobile: 210,
    name: "May",
  },
  {
    desktop: 354,
    mobile: 240,
    name: "Jun",
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
    type="line"
    data={data}
    series={["desktop", "mobile"]}
    config={config}
    scale={1}
  />
);

export default Example;
