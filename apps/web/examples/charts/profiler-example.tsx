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

const Example = () => {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<1 | 2>(1);

  /* eslint-disable react-doctor/effect-needs-cleanup -- Observer allocation occurs only for a mounted node and its returned disconnect closure owns the same observer. */
  useEffect(() => {
    const node = container.current;

    let disconnect: (() => void) | undefined;

    if (node !== null) {
      const measure = () => {
        setScale(node.clientWidth >= 560 ? 2 : 1);
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);

      disconnect = () => {
        observer.disconnect();
      };
    }

    return disconnect;
  }, []);
  /* eslint-enable react-doctor/effect-needs-cleanup */

  return (
    <div
      ref={container}

      className="grid [justify-items:safe_center] [min-width:0]"
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
};

export default Example;
