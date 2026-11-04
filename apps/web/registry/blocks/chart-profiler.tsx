"use client";

import * as React from "react";
import { PieChart, Pie, Cell } from "recharts";

import {
  ChartContainer,
  ChartProfilerSector,
  ChartProfilerFrame,
  ChartTooltip,
  ChartTooltipContent,
  chartProfilerColor,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface ProfilerRecipeStyle extends React.CSSProperties {
  "--mc-profiler-chart-height": string;
  "--mc-profiler-chart-width": string;
}

/** Ordinary counts, durations or revenue; Recharts calculates the shares. */
export const ProfilerChartExample = ({
  data,
  dataKey,
  nameKey = "name",
  rootName = "root",
  globalPercentage = 100,
  scale = 2,
  style,
  className,
  "aria-label": ariaLabel,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: { [key: string]: string | number }[];
  dataKey: string;
  nameKey?: string;
  rootName?: string;
  globalPercentage?: number;
  scale?: 1 | 2 | 3;
}) => {
  const containerStyle: ProfilerRecipeStyle = {
    "--mc-profiler-chart-height": `${(139 + data.length * 9) * scale}px`,
    "--mc-profiler-chart-width": `${270 * scale}px`,
    ...style,
  };

  return (
    <ChartContainer
      {...props}
      config={{ [dataKey]: { label: dataKey } }}
      scale={scale}
      className={cn(
        "mc-chart-profiler-recipe relative aspect-auto h-(--mc-profiler-chart-height) w-(--mc-profiler-chart-width)",
        className
      )}
      style={containerStyle}
    >
      <PieChart
        accessibilityLayer
        aria-label={ariaLabel}
        margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
      >
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx={135 * scale}
          cy={67 * scale}
          outerRadius={105 * scale}
          startAngle={-90}
          endAngle={270}
          isAnimationActive={false}
          // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Recharts requires this renderer prop's spelling.
          shape={ChartProfilerSector}
        >
          {data.map((row, index) => (
            <Cell key={index} fill={chartProfilerColor(String(row[nameKey]))} />
          ))}
        </Pie>
        <ChartProfilerFrame
          rootName={rootName}
          globalPercentage={globalPercentage}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
};
