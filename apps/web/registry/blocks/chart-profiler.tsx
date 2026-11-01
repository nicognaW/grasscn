"use client";
import * as React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartProfilerSector, ChartProfilerFrame, ChartTooltip, ChartTooltipContent, chartProfilerColor } from "@/components/ui/chart";

/** Ordinary counts, durations or revenue; Recharts calculates the shares. */
export function ProfilerChartExample({ data, dataKey, nameKey = "name", rootName = "root", globalPercentage = 100, scale = 2, style, "aria-label": ariaLabel, ...props }: Omit<React.ComponentProps<"div">, "children"> & {
  data: { [key: string]: string | number }[];
  dataKey: string;
  nameKey?: string;
  rootName?: string;
  globalPercentage?: number;
  scale?: 1 | 2 | 3;
}) {
  return <ChartContainer {...props} config={{ [dataKey]: { label: dataKey } }} scale={scale} style={{ position: "relative", width: 270 * scale, height: (139 + data.length * 9) * scale, aspectRatio: "auto", background: "rgba(80,80,80,0.5647058823529412)", ...style }}>
    <PieChart accessibilityLayer aria-label={ariaLabel} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx={135 * scale} cy={67 * scale} outerRadius={105 * scale} startAngle={-90} endAngle={270} isAnimationActive={false} shape={ChartProfilerSector}>
        {data.map((row, index) => <Cell key={index} fill={chartProfilerColor(String(row[nameKey]))} />)}
      </Pie>
      <ChartProfilerFrame rootName={rootName} globalPercentage={globalPercentage} />
      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
    </PieChart>
  </ChartContainer>;
}
