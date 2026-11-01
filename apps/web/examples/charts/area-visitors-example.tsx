"use client";

import { AnalyticsChartExample } from "@/components/chart-analytics";

const data = [
  {
    name: "Jan",
    desktop: 186,
    mobile: 80,
  },
  {
    name: "Feb",
    desktop: 305,
    mobile: 200,
  },
  {
    name: "Mar",
    desktop: 237,
    mobile: 120,
  },
  {
    name: "Apr",
    desktop: 273,
    mobile: 190,
  },
  {
    name: "May",
    desktop: 309,
    mobile: 210,
  },
  {
    name: "Jun",
    desktop: 354,
    mobile: 240,
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
      type="area"
      data={data}
      series={["desktop", "mobile"]}
      config={config}
      scale={1}
    />
  );
}
