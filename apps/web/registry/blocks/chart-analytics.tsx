"use client";

import * as React from "react";
// oxlint-disable-next-line react-doctor/prefer-dynamic-import -- The exported chart composition renders Recharts synchronously; a lazy boundary would introduce suspension/loading and change the existing rendering contract.
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PolarGrid,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartPixelSurface,
  ChartAxisTick,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface AnalyticsScalePaint extends React.CSSProperties {
  "--mc-scale": number;
}

interface AnalyticsRecipeStyle extends React.CSSProperties {
  "--mc-analytics-chart-height": string;
}

export type AnalyticsChartType =
  | "bar"
  | "stacked-bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "radar"
  | "radial";

const colors = [
  "#55ff55",
  "#5555ff",
  "#ffff55",
  "#ff5555",
  "#55ffff",
  "#ff55ff",
];

const AnalyticsScale = React.createContext(2);

const abbreviateAnalyticsTick = function abbreviateAnalyticsTick(
  value: string | number
) {
  return String(value).slice(0, 3);
};

const AnalyticsAxisTick = (
  tickProps: React.ComponentProps<typeof ChartAxisTick>
) => {
  const scale = React.useContext(AnalyticsScale);

  return (
    <ChartAxisTick
      {...tickProps}
      tickFormatter={abbreviateAnalyticsTick}
      dy={4 * scale}
    />
  );
};

/** Example gallery recipe. Consumers compose Recharts directly in ChartContainer. */
export const AnalyticsChartExample = ({
  data,
  config,
  series,
  type = "bar",
  scale = 2,
  height = 140,
  style,
  className,
  "aria-label": ariaLabel,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: { name: string; [key: string]: string | number }[];
  config: ChartConfig;
  series: string[];
  type?: AnalyticsChartType;
  scale?: 1 | 2 | 3;
  height?: number;
}) => {
  const color = (key: string, index: number) =>
    config[key]?.color ??
    `var(--color-${key},${colors[index % colors.length]})`;

  const tooltip = (
    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
  );

  const legend = <ChartLegend content={<ChartLegendContent />} />;

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="#555555" />
      <XAxis
        dataKey="name"
        tickLine={false}
        axisLine={false}
        tick={<AnalyticsAxisTick />}
      />
      <YAxis
        width={26 * scale}
        tickLine={false}
        axisLine={false}
        tick={<ChartAxisTick />}
      />
    </>
  );

  const margin = { bottom: 0, left: 0, right: 8 * scale, top: 8 * scale };
  let chart: React.ReactElement;

  if (type === "pie" || type === "donut") {
    chart = (
      <PieChart
        accessibilityLayer
        aria-label={ariaLabel}
        margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
      >
        {" "}
        {tooltip}
        <Pie
          data={data}
          dataKey={series[0]}
          nameKey="name"
          innerRadius={type === "donut" ? "45%" : 0}
          outerRadius="75%"
          isAnimationActive={false}
        >
          {data.map((_, index) => (
            // oxlint-disable-next-line typescript/no-deprecated -- Retain the current Recharts 3 Cell configuration contract and per-row palette precedence in sector/legend/tooltip payloads; migrating to shape/content requires a separately qualified rendering and payload change before Recharts 4 removes Cell.
            <Cell
              // oxlint-disable-next-line react-doctor/no-array-index-as-key -- Recharts consumes these stateless Cell configurations by data ordinal; names may repeat and the public row schema has no required unique ID. Keep the palette/index binding.
              key={index}
              fill={colors[index % colors.length]}
            />
          ))}
        </Pie>
        <ChartPixelSurface />
        {legend}
      </PieChart>
    );
  } else if (type === "radial") {
    chart = (
      <RadialBarChart
        accessibilityLayer
        aria-label={ariaLabel}
        margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
        data={data}
        innerRadius="15%"
        outerRadius="90%"
        startAngle={90}
        endAngle={450}
      >
        <PolarAngleAxis type="number" domain={[0, "dataMax"]} tick={false} />
        <RadialBar dataKey={series[0]} isAnimationActive={false}>
          {data.map((_, index) => (
            // oxlint-disable-next-line typescript/no-deprecated -- Retain the current Recharts 3 Cell configuration contract and per-row palette precedence in sector/legend/tooltip payloads; migrating to shape/content requires a separately qualified rendering and payload change before Recharts 4 removes Cell.
            <Cell
              // oxlint-disable-next-line react-doctor/no-array-index-as-key -- Recharts consumes these stateless Cell configurations by data ordinal; names may repeat and the public row schema has no required unique ID. Keep the palette/index binding.
              key={index}
              fill={colors[index % colors.length]}
            />
          ))}
        </RadialBar>
        <ChartPixelSurface />
        {tooltip}
        {legend}
      </RadialBarChart>
    );
  } else if (type === "radar") {
    chart = (
      <RadarChart
        accessibilityLayer
        aria-label={ariaLabel}
        data={data}
        margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
      >
        {" "}
        <PolarGrid stroke="#555555" />
        <PolarAngleAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={<ChartAxisTick />}
        />
        {series.map((key, index) => (
          <Radar
            key={key}
            dataKey={key}
            fill={color(key, index)}
            stroke={color(key, index)}
            fillOpacity={0.25}
            isAnimationActive={false}
          />
        ))}
        <ChartPixelSurface />
        {tooltip}
        {legend}
      </RadarChart>
    );
  } else if (type === "line") {
    chart = (
      <LineChart
        accessibilityLayer
        aria-label={ariaLabel}
        data={data}
        margin={margin}
      >
        {axes}
        {series.map((key, index) => (
          <Line
            key={key}
            dataKey={key}
            type="linear"
            stroke={color(key, index)}
            isAnimationActive={false}
            activeDot={false}
          />
        ))}
        <ChartPixelSurface />
        {tooltip}
        {legend}
      </LineChart>
    );
  } else if (type === "area") {
    chart = (
      <AreaChart
        accessibilityLayer
        aria-label={ariaLabel}
        data={data}
        margin={margin}
      >
        {axes}
        {series.map((key, index) => (
          <Area
            key={key}
            dataKey={key}
            type="linear"
            stroke={color(key, index)}
            fillOpacity={0.25}
            isAnimationActive={false}
            activeDot={false}
          />
        ))}
        <ChartPixelSurface />
        {tooltip}
        {legend}
      </AreaChart>
    );
  } else {
    chart = (
      <BarChart
        accessibilityLayer
        aria-label={ariaLabel}
        data={data}
        margin={margin}
      >
        {axes}
        {series.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={color(key, index)}
            stackId={type === "stacked-bar" ? "visitors" : undefined}
            isAnimationActive={false}
          />
        ))}
        <ChartPixelSurface />
        {tooltip}
        {legend}
      </BarChart>
    );
  }

  const containerStyle: AnalyticsRecipeStyle = {
    "--mc-analytics-chart-height": `${height * scale}px`,
    ...style,
  };

  return (
    <AnalyticsScale.Provider value={scale}>
      <div data-slot="chart-example" data-chart-type={type}>
        <ChartContainer
          {...props}
          config={config}
          scale={scale}
          className={cn(
            "aspect-auto h-(--mc-analytics-chart-height) w-full",
            className
          )}
          style={containerStyle}
        >
          {chart}
        </ChartContainer>
        <details
          className="mc-chart-data"
          style={
            // SAFETY: --mc-scale is this owner's CSS custom-property channel; this CSSProperties view passes the exact owned variable map to React without changing its values.
            {
              "--mc-scale": scale,
            } satisfies AnalyticsScalePaint as AnalyticsScalePaint
          }
        >
          <summary>View chart data</summary>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  {series.map((key) => (
                    <th key={key}>{config[key]?.label ?? key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    {series.map((key) => (
                      <td key={key}>{row[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </AnalyticsScale.Provider>
  );
};
