"use client";

import { useEffect, useRef, useState } from "react";

import { FpsChartExample } from "@/components/chart-fps";

const data = Array.from({ length: 240 }, (_, index) => {
  const sample = [86, 112, 98, 172, 146, 104, 132, 220, 158, 94, 121, 188][
    index % 12
  ];
  return { value: sample / 10 };
});

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
      <FpsChartExample
        aria-label="Frame timing"
        data={data}
        dataKey="value"
        framerateLimit={120}
        scale={scale}
      />
    </div>
  );
}
