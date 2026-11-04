"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartPixelBar,
  ChartFpsFrame,
  ChartTooltip,
  ChartTooltipContent,
  chartFpsColor,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const DEFAULT_FPS_DOMAIN: [number, number] = [0, 1000 / 30];

const formatFrameDuration = (value: number) => `${Math.round(value)} ms`;

interface FpsRecipeStyle extends React.CSSProperties {
  "--mc-fps-chart-height": string;
  "--mc-fps-chart-width": string;
}

/** Example composition. Values and domains use ordinary application units. */
export const FpsChartExample = ({
  data,
  dataKey,
  domain = DEFAULT_FPS_DOMAIN,
  formatValue = formatFrameDuration,
  guides,
  framerateLimit = 260,
  width = 242,
  scale = 2,
  style,
  className,
  "aria-label": ariaLabel,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: Record<string, string | number | null>[];
  dataKey: string;
  domain?: [number, number];
  formatValue?: (value: number) => string;
  guides?: { value: number; label: string }[];
  framerateLimit?: number;
  width?: number;
  scale?: 1 | 2 | 3;
}) => {
  const visible = data.slice(-(width - 2));
  const values = visible.map((row) => Number(row[dataKey]));

  const rows = [
    ...visible,
    ...Array.from({ length: Math.max(0, width - 2 - visible.length) }, () => ({
      [dataKey]: null,
    })),
  ];

  const labels = values.length
    ? [
        Math.min(...values),
        values.reduce((a, b) => a + b, 0) / values.length,
        Math.max(...values),
      ].map(
        (value, index) =>
          `${formatValue(value)} ${["min", "avg", "max"][index]}`
      )
    : [];

  const containerStyle: FpsRecipeStyle = {
    "--mc-fps-chart-height": `${69 * scale}px`,
    "--mc-fps-chart-width": `${width * scale}px`,
    ...style,
  };
  // Preserve eager color reads after the style spread. Recharts can skip
  // rectangles before it invokes the renderer.

  const fills = rows.map((row) =>
    chartFpsColor(
      ((Number(row[dataKey]) - domain[0]) / (domain[1] - domain[0])) *
        (1000 / 30) *
        1e6
    )
  );

  return (
    <ChartContainer
      {...props}
      config={{ [dataKey]: { color: "#55ff55", label: dataKey } }}
      scale={scale}
      className={cn(
        "relative aspect-auto h-(--mc-fps-chart-height) w-(--mc-fps-chart-width)",
        className
      )}
      style={containerStyle}
    >
      <BarChart
        accessibilityLayer
        aria-label={ariaLabel}
        data={rows}
        margin={{ bottom: 0, left: scale, right: scale, top: 9 * scale }}
        barCategoryGap={0}
        barGap={0}
      >
        <XAxis hide padding={{ left: 0, right: 0 }} />
        <YAxis hide domain={domain} allowDataOverflow />
        <Bar
          dataKey={dataKey}
          isAnimationActive={false}
          // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Recharts requires this renderer prop's spelling.
          shape={(barProps) => (
            <ChartPixelBar
              {...barProps}
              fill={fills[barProps.originalDataIndex]}
            />
          )}
        />
        <ChartFpsFrame
          labels={labels}
          framerateLimit={framerateLimit}
          guides={guides}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
      </BarChart>
    </ChartContainer>
  );
};
