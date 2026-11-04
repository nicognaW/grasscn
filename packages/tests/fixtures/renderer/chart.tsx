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
  "--fixture-x": `${(c.x ?? 16) * scale}px`,
  "--fixture-y": `${(c.y ?? 16) * scale}px`,
};

const DesktopFixtureIcon = () => (
  <svg aria-label="Desktop icon" width="12" height="12">
    <rect width="12" height="12" fill="green" />
  </svg>
);

const formatFixtureTooltip: NonNullable<
  React.ComponentProps<typeof ChartTooltipContent>["formatter"]
> = (value, name) => <span data-testid="formatted">{`${name}:${value}`}</span>;

const formatFixtureTooltipLabel: NonNullable<
  React.ComponentProps<typeof ChartTooltipContent>["labelFormatter"]
> = (value) => (
  <strong data-testid="label-formatted">{`Season:${String(value)}`}</strong>
);

const ApiFixture = () => {
  let apiScale: 1 | 2 | 3 = 2;

  if (scale === 1) {
    apiScale = 1;
  } else if (scale === 3) {
    apiScale = 3;
  }

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
      icon: DesktopFixtureIcon,
      label: "世界",
      theme: { dark: "#00aa11", light: "#22dd44" },
    },
    mobile: { color: "#ffcc00", label: "Mobile" },
  };

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  let selectedFixtureBranch1: "line" | "dashed" | "dot";

  if (p.get("indicator") === "line") {
    selectedFixtureBranch1 = "line";
  } else {
    selectedFixtureBranch1 = p.get("indicator") === "dashed" ? "dashed" : "dot";
  }

  return (
    <>
      <ChartContainer
        id="world-activity"
        config={config}
        scale={apiScale}
        initialDimension={{ height: 300, width: 480 }}
        className="fixture-height-300 fixture-geometry-width"
        style={{ "--fixture-width": `${wide ? 600 : 480}px` }}
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
                indicator={selectedFixtureBranch1}
                nameKey={p.get("nameKey") ?? undefined}
                labelKey={p.get("labelKey") ?? undefined}
                formatter={
                  p.has("formatter") ? formatFixtureTooltip : undefined
                }
                labelFormatter={
                  p.has("labelFormatter")
                    ? formatFixtureTooltipLabel
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
        className="fixture-height-160 fixture-width-320"
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

  if (p.has("metric")) {
    return <MetricFixture />;
  }

  if (c.element === "chart-fps") {
    return (
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
        className="fixture-geometry-x fixture-placement-fixed fixture-geometry-y"
        style={style}
        data-subject="true"
      />
    );
  }

  if (c.element === "chart-pie") {
    return (
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
        className="fixture-geometry-x fixture-placement-fixed fixture-geometry-y"
        style={style}
        data-subject="true"
      />
    );
  }

  return <ApiFixture />;
};
