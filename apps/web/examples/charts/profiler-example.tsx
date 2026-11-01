"use client";

import { useEffect, useRef, useState } from "react";

import { ProfilerChartExample } from "@/components/chart-profiler";

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

export default function Example() {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<1 | 2>(1);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth >= 560 ? 2 : 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={container}
      className="chart-native-fit"
      style={{ minWidth: 0, display: "grid", justifyItems: "safe center" }}
    >
      <ProfilerChartExample
        aria-label="Browser share"
        data={data}
        rootName="Visitors"
        dataKey="visitors"
        scale={scale}
      />
    </div>
  );
}
