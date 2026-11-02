"use client";

import { useEffect, useRef, useState } from "react";

import { FpsChartExample } from "@/components/chart-fps";

const data = Array.from({ length: 240 }, (_, index) => {
  const sample = [86, 112, 98, 172, 146, 104, 132, 220, 158, 94, 121, 188][
    index % 12
  ];

  return { value: Math.round(sample / 3) };
});

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

      /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", justifyItems: "safe center", minWidth: 0 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <FpsChartExample
        aria-label="Request volume"
        data={data}
        dataKey="value"
        domain={[0, 100]}
        formatValue={(value) => `${Math.round(value)} req`}
        guides={[
          { label: "100 req", value: 100 },
          { label: "50 req", value: 50 },
        ]}
        scale={scale}
      />
    </div>
  );
};

export default Example;
