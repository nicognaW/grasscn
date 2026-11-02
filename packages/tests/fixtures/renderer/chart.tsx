import { FpsChartExample } from "@grasscn/web/blocks/chart-fps";
import { ProfilerChartExample } from "@grasscn/web/blocks/chart-profiler";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartPixelSurface,
} from "@grasscn/web/ui/chart";
import * as React from "react";
import { BarChart, Bar, XAxis, CartesianGrid } from "recharts";

import type { ChartFixtureQuery } from "./fixture-query-protocol";

const p = new URLSearchParams(location.search);

// SAFETY: owned chart callers serialize native FPS/Profiler cases or the ordinary metric/default query fields.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Chart fixture query producer boundary.
const c = JSON.parse(p.get("case") ?? "{}") as ChartFixtureQuery;

const scale = c.scale ?? 2;

const style = {
  left: (c.x ?? 16) * scale,
  position: "fixed" as const,
  top: (c.y ?? 16) * scale,
};

const ApiFixture = () => {
  const [wide, setWide] = React.useState(false);
  const [dark, setDark] = React.useState(false);
  const [revision, setRevision] = React.useState(0);

  const data = React.useMemo(
    () => [
      { desktop: 20 + revision, mobile: 12, month: "Spring" },
      { desktop: 30, mobile: 8, month: "Summer" },
      { desktop: 10, mobile: 15, month: "Winter" },
    ],
    [revision]
  );

  const config = {
    desktop: {
      icon: () => (
        <svg aria-label="Desktop icon" width="12" height="12">
          <rect width="12" height="12" fill="green" />
        </svg>
      ),
      label: "世界",
      theme: { dark: "#00aa11", light: "#22dd44" },
    },
    mobile: { color: "#ffcc00", label: "Mobile" },
  };

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <>
      <ChartContainer
        id="world-activity"
        config={config}
        scale={2}
        initialDimension={{ height: 300, width: 480 }}
        style={{ height: 300, width: wide ? 600 : 480 }}
      >
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" />
          <ChartTooltip
            active={p.has("active") ? true : undefined}
            defaultIndex={0}
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel={p.has("hideLabel")}
                hideIndicator={p.has("hideIndicator")}
                indicator={
                  p.get("indicator") === "line"
                    ? "line"
                    : p.get("indicator") === "dashed"
                      ? "dashed"
                      : "dot"
                }
                nameKey={p.get("nameKey") ?? undefined}
                labelKey={p.get("labelKey") ?? undefined}
                formatter={
                  p.has("formatter")
                    ? (value, name) => (
                        <span data-testid="formatted">{`${name}:${value}`}</span>
                      )
                    : undefined
                }
                labelFormatter={
                  p.has("labelFormatter")
                    ? (value) => (
                        <strong data-testid="label-formatted">{`Season:${String(value)}`}</strong>
                      )
                    : undefined
                }
              />
            }
          />
          <ChartLegend
            content={
              <ChartLegendContent
                hideIcon={p.has("hideIcon")}
                nameKey={p.get("nameKey") ?? undefined}
              />
            }
          />
          <Bar
            dataKey="desktop"
            fill="var(--color-desktop)"
            isAnimationActive={false}
          />
          <Bar
            dataKey="mobile"
            fill="var(--color-mobile)"
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      <ChartContainer
        id="themed-pixels"
        config={config}
        scale={2}
        style={{ height: 160, width: 320 }}
      >
        <BarChart data={data}>
          <Bar
            dataKey="desktop"
            fill="var(--color-desktop)"
            isAnimationActive={false}
          />
          <ChartPixelSurface />
        </BarChart>
      </ChartContainer>
      <button
        type="button"
        id="resize"
        onClick={() => {
          setWide((v) => !v);
        }}
      >
        Resize
      </button>
      <button
        type="button"
        id="theme"
        onClick={() => {
          setDark((v) => !v);
        }}
      >
        Theme
      </button>
      <button
        type="button"
        id="update"
        onClick={() => {
          setRevision((v) => v + 1);
        }}
      >
        Update
      </button>
      <button
        type="button"
        id="plot-update"
        onClick={() => {
          setRevision((v) => v + 1);
        }}
      >
        Plot update
      </button>
      <ProfilerChartExample
        dataKey="percentage"
        id="reactive-pie"
        scale={1}
        data={[
          { name: "render", percentage: revision ? 25 : 50 },
          { name: "tick", percentage: revision ? 75 : 50 },
        ]}
      />
    </>
  );
};

const MetricFixture = () => {
  const [changed, setChanged] = React.useState(false);
  const [custom, setCustom] = React.useState(false);

  return (
    <>
      <FpsChartExample
        dataKey="value"
        id="metric-subject"
        data={(changed ? [25, 75, 125, 175, 225] : [0, 50, 100, 150, 200]).map(
          (value) => ({ value })
        )}
        domain={[0, 200]}
        scale={c.scale ?? 2}
        width={c.width ?? 242}
        formatValue={
          custom
            ? (value) => `${value.toFixed(1)} req`
            : (value) => `${Math.round(value)} ms`
        }
        guides={[
          { label: "Goal", value: 100 },
          { label: "Ceiling", value: 200 },
        ]}
      />
      <button
        type="button"
        id="metric-update"
        onClick={() => {
          setChanged((value) => !value);
        }}
      >
        Update metric
      </button>
      <button
        type="button"
        id="metric-format"
        onClick={() => {
          setCustom((value) => !value);
        }}
      >
        Format metric
      </button>
    </>
  );
};

export const ChartFixture = () => {
  React.useLayoutEffect(() => {
    const bg = c.background ?? "#202020";
    const html = document.documentElement.style.background;
    const body = document.body.style.background;

    document.documentElement.style.background = bg;
    document.body.style.background = bg;

    return () => {
      document.documentElement.style.background = html;
      document.body.style.background = body;
    };
  }, []);

  return p.has("metric") ? (
    <MetricFixture />
  ) : c.element === "chart-fps" ? (
    <FpsChartExample
      dataKey="value"
      id="subject"
      scale={scale}
      width={c.width}
      data={c.samples
        .slice(-240)
        .slice(Math.max(0, 240 - ((c.width ?? 242) - 2)))
        .map((value: number) => ({ value: value / 1e6 }))}
      framerateLimit={c.value}
      style={style}
      data-subject="true"
    />
  ) : c.element === "chart-pie" ? (
    <ProfilerChartExample
      dataKey="percentage"
      id="subject"
      scale={scale}
      rootName={c.rootName}
      data={(c.labels ?? []).map((name: string, i: number) => ({
        globalPercentage: c.globalPercentages[i],
        name,
        percentage: c.percentages[i],
      }))}
      style={style}
      data-subject="true"
    />
  ) : (
    <ApiFixture />
  );
};
