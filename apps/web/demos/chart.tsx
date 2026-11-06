import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import type { AnalyticsChartType } from "../registry/blocks/chart-analytics";
import { AnalyticsChartExample } from "../registry/blocks/chart-analytics";
import { FpsChartExample } from "../registry/blocks/chart-fps";
import { ProfilerChartExample } from "../registry/blocks/chart-profiler";
import { Button } from "../registry/ui/button";
import type { ChartConfig } from "../registry/ui/chart";
import { MinecraftDisclosureText } from "../registry/ui/minecraft-disclosure-text";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../registry/ui/select";
import type { DemoProps } from "../types";

// Official shadcn chart-bar-multiple and chart-pie-donut example datasets.
const visitors = [
  {
    desktop: 186,
    mobile: 80,
    name: "January",
  },
  {
    desktop: 305,
    mobile: 200,
    name: "February",
  },
  {
    desktop: 237,
    mobile: 120,
    name: "March",
  },
  {
    desktop: 73,
    mobile: 190,
    name: "April",
  },
  {
    desktop: 209,
    mobile: 130,
    name: "May",
  },
  {
    desktop: 214,
    mobile: 140,
    name: "June",
  },
];

const browsers = [
  { name: "Chrome", visitors: 275 },
  { name: "Safari", visitors: 200 },
  { name: "Firefox", visitors: 187 },
  { name: "Edge", visitors: 173 },
  { name: "Other", visitors: 90 },
];

const config: ChartConfig = {
  desktop: {
    color: "#55ff55",
    label: "Desktop",
  },
  mobile: {
    color: "#5555ff",
    label: "Mobile",
  },
  visitors: {
    color: "#55ff55",
    label: "Visitors",
  },
};

const types: {
  value: AnalyticsChartType;
  label: string;
}[] = [
  {
    label: "Bar",
    value: "bar",
  },
  {
    label: "Stacked bar",
    value: "stacked-bar",
  },
  {
    label: "Line",
    value: "line",
  },
  {
    label: "Area",
    value: "area",
  },
  {
    label: "Pie",
    value: "pie",
  },
  {
    label: "Donut",
    value: "donut",
  },
  {
    label: "Radar",
    value: "radar",
  },
  {
    label: "Radial",
    value: "radial",
  },
];

const renderWebF3Charts = function renderWebF3Charts({
  browserData,
  contentWidth,
  copy,
  metric,
  scale,
  setMetric,
  setWebStep,
  webSamples,
}: {
  browserData: { name: string; visitors: number }[];
  contentWidth: number;
  copy: (text: string) => React.JSX.Element;
  metric: string;
  scale: DemoProps["scale"];
  setMetric: React.Dispatch<React.SetStateAction<string>>;
  setWebStep: React.Dispatch<React.SetStateAction<number>>;
  webSamples: number[];
}) {
  const demoLayout1: DemoVariables = {
    "--demo-owned-chart-1-width": `${Math.min(116, contentWidth) * scale}px`,
  };

  const demoLayout2: DemoVariables = {
    "--demo-owned-chart-2-width": `${Math.min(100, contentWidth) * scale}px`,
  };

  return (
    <section
      data-f3-web-data="true"
      className="flex w-full max-w-full min-w-0 flex-col gap-(--demo-gap)"
      style={
        /* SAFETY: satisfies checks --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
        {
          "--demo-gap": `${8 * scale}px`,
        } satisfies DemoVariables as DemoVariables
      }
    >
      {copy("Vanilla F3 charts with web data")}
      {copy(
        metric === "latency"
          ? "API response time - milliseconds"
          : "Website requests per minute"
      )}
      <div
        className="flex flex-wrap gap-(--demo-gap)"
        style={
          /* SAFETY: satisfies checks --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-gap": `${6 * scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <Select
          items={{ latency: "Response time", requests: "Request volume" }}
          scale={scale}
          value={metric}
          onValueChange={(value) => {
            setMetric(value ?? "");
          }}
        >
          <SelectTrigger
            aria-label="F3 metric"
            className="demo-owned-chart-1 max-w-full"
            style={demoLayout1}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latency">Response time</SelectItem>
            <SelectItem value="requests">Request volume</SelectItem>
          </SelectContent>
        </Select>
        <Button
          scale={scale}
          type="button"
          className="demo-owned-chart-2 max-w-full"
          style={demoLayout2}
          onClick={() => {
            setWebStep((value) => value + 1);
          }}
        >
          Next hour
        </Button>
      </div>
      <div
        className="flex w-full max-w-full min-w-0 flex-col items-start gap-(--demo-gap) overflow-x-auto p-(--demo-padding)"
        style={
          /* SAFETY: satisfies checks --demo-gap, --demo-padding against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-gap": `${8 * scale}px`,
            "--demo-padding": `${scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <FpsChartExample
          data-web-chart="metric"
          aria-label={
            metric === "latency" ? "API response time" : "Requests per minute"
          }
          data={webSamples.map((value) => ({ value }))}
          dataKey="value"
          domain={metric === "latency" ? [0, 300] : [0, 80]}
          formatValue={(v) =>
            `${Math.round(v)} ${metric === "latency" ? "ms" : "req"}`
          }
          guides={
            metric === "latency"
              ? [
                  {
                    label: "300 ms",
                    value: 300,
                  },
                  {
                    label: "150 ms",
                    value: 150,
                  },
                ]
              : [
                  {
                    label: "80 req",
                    value: 80,
                  },
                  {
                    label: "40 req",
                    value: 40,
                  },
                ]
          }
          scale={scale}
        />
        <ProfilerChartExample
          dataKey="visitors"
          data-web-chart="profiler"
          aria-label="Browser visitor share"
          data={browserData}
          rootName="Browser visitors"
          scale={scale}
        />
      </div>
      {copy(
        "Illustrative web data. The F3 bar scale and captions adapt to the selected metric."
      )}
    </section>
  );
};

const renderNativeF3Charts = function renderNativeF3Charts({
  contentWidth,
  copy,
  limit,
  nativeData,
  samples,
  scale,
  setLimit,
  setStep,
}: {
  contentWidth: number;
  copy: (text: string) => React.JSX.Element;
  limit: number;
  nativeData: { name: string; percentage: number }[];
  samples: number[];
  scale: DemoProps["scale"];
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const demoLayout3: DemoVariables = {
    "--demo-owned-chart-3-width": `${Math.min(120, contentWidth) * scale}px`,
  };

  const demoLayout4: DemoVariables = {
    "--demo-owned-chart-4-width": `${Math.min(100, contentWidth) * scale}px`,
  };

  return (
    <section
      className="mc-chart-native-examples flex w-full max-w-full min-w-0 flex-col gap-(--demo-gap)"
      data-chart-native-examples="true"
      style={
        /* SAFETY: satisfies checks --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
        {
          "--demo-gap": `${8 * scale}px`,
        } satisfies DemoVariables as DemoVariables
      }
    >
      {copy("F3 charts")}
      <div
        className="flex flex-wrap gap-(--demo-gap)"
        style={
          /* SAFETY: satisfies checks --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-gap": `${6 * scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <Button
          scale={scale}
          type="button"
          className="demo-owned-chart-3 max-w-full"
          style={demoLayout3}
          onClick={() => {
            setStep((v) => v + 1);
          }}
        >
          Next sample
        </Button>
        <Button
          scale={scale}
          type="button"
          className="demo-owned-chart-4 max-w-full"
          style={demoLayout4}
          onClick={() => {
            setLimit((v) => (v === 120 ? 260 : 120));
          }}
        >
          {limit === 120 ? "120 FPS cap" : "Unlimited"}
        </Button>
      </div>
      <div
        className="flex w-full max-w-full min-w-0 flex-col items-start gap-(--demo-gap) overflow-x-auto p-(--demo-padding)"
        style={
          /* SAFETY: satisfies checks --demo-gap, --demo-padding against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-gap": `${8 * scale}px`,
            "--demo-padding": `${scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <FpsChartExample
          data-native-chart="fps"
          data={samples.map((value) => ({ value: value / 1e6 }))}
          dataKey="value"
          framerateLimit={limit}
          scale={scale}
        />
        <ProfilerChartExample
          dataKey="percentage"
          data-native-chart="profiler"
          data={nativeData}
          scale={scale}
        />
      </div>
    </section>
  );
};

const initialChartType = "area";

const ChartDemo = ({ scale }: DemoProps) => {
  const stage = React.useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = React.useState(80);

  React.useLayoutEffect(() => {
    // SAFETY: React attaches this private, unkeyed <div> before effect setup. The ref has one intrinsic attachment and no other writer; existing cleanup guards or cancels every deferred use.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The owned intrinsic commit and existing effect lifetime prove this exact HTMLDivElement capture.
    const node = stage.current as HTMLDivElement;

    const measure = () => {
      const css = getComputedStyle(node);
      setContentWidth(
        Math.max(
          40,
          Math.floor(
            (node.clientWidth -
              // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
              Number.parseFloat(css.paddingLeft) -
              // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
              Number.parseFloat(css.paddingRight)) /
              scale
          )
        )
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(
      // SAFETY: React attaches this always-rendered <div> before its synchronous layout effect setup reads the owned stage ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLDivElement result.
      stage.current as HTMLDivElement
    );

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  const copy = (text: string) => (
    <MinecraftDisclosureText scale={scale} maxWidth={contentWidth}>
      {text}
    </MinecraftDisclosureText>
  );

  const [type, setType] = React.useState<AnalyticsChartType>(initialChartType);
  const [period, setPeriod] = React.useState("6");
  const [device, setDevice] = React.useState("both");

  const [step, setStep] = React.useState(0);
  const [limit, setLimit] = React.useState(120);

  const [metric, setMetric] = React.useState("latency");
  const [webStep, setWebStep] = React.useState(0);

  const webSamples = React.useMemo(
    () =>
      Array.from({ length: 240 }, (_, i) =>
        metric === "latency"
          ? [86, 112, 98, 172, 146, 104, 132, 220, 158, 94, 121, 188][
              (i + webStep) % 12
            ]
          : [18, 32, 28, 46, 35, 24, 41, 62, 38, 26, 34, 53][(i + webStep) % 12]
      ),
    [metric, webStep]
  );

  const browserData = React.useMemo(() => {
    const rows = browsers.map((row, i) => ({
      ...row,
      visitors: row.visitors + (webStep % 3) * (i + 1) * 5,
    }));

    return rows.map((row) => ({ name: row.name, visitors: row.visitors }));
  }, [webStep]);

  const samples = React.useMemo(
    () =>
      Array.from({ length: 240 }, (_, i) => (((i * 7 + step) % 30) + 1) * 1e6),
    [step]
  );

  const nativeData = React.useMemo(
    () => [
      { name: "render", percentage: step % 2 ? 35 : 50 },
      { name: "tick", percentage: step % 2 ? 65 : 50 },
    ],
    [step]
  );

  const circular = ["pie", "donut", "radial"].includes(type);

  const data = React.useMemo<
    React.ComponentProps<typeof AnalyticsChartExample>["data"]
  >(
    () => (circular ? browsers : visitors.slice(-Number(period))),
    [circular, period]
  );

  const series = React.useMemo(() => {
    if (circular) {
      return ["visitors"];
    }

    if (device === "both") {
      return ["desktop", "mobile"];
    }

    return [device];
  }, [circular, device]);

  const total = data.reduce(
    (n, row) => n + series.reduce((s, key) => s + Number(row[key]), 0),
    0
  );

  const demoLayout5: DemoVariables = {
    "--demo-owned-chart-5-width": `${Math.min(116, contentWidth) * scale}px`,
  };

  return (
    <>
      <div
        ref={stage}
        className="demo-stage demo-stage-display-flex demo-stage-flex-wrap-nowrap demo-stage-align-items-stretch demo-stage-min-width-0 flex-col"
        data-stage="chart"
        style={
          /* SAFETY: satisfies checks --mc-scale, --demo-stage-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-stage-gap": `${10 * scale}px`,
            "--mc-scale": scale,
          } satisfies DemoVariables as DemoVariables
        }
      >
        {renderWebF3Charts({
          browserData,
          contentWidth,
          copy,
          metric,
          scale,
          setMetric,
          setWebStep,
          webSamples,
        })}
        {renderNativeF3Charts({
          contentWidth,
          copy,
          limit,
          nativeData,
          samples,
          scale,
          setLimit,
          setStep,
        })}
        {copy("More pixel-styled chart types")}
        {copy(circular ? "Browser visitors" : "Website visitors")}
        {copy(
          circular
            ? "Browser share - Jan to Jun 2024"
            : `${period === "3" ? "Apr to Jun" : "Jan to Jun"} 2024 - Desktop and mobile`
        )}
        <div
          className="flex flex-wrap gap-(--demo-gap)"
          style={
            /* SAFETY: satisfies checks --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-gap": `${6 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          <Select<AnalyticsChartType>
            items={types}
            scale={scale}
            value={type}
            onValueChange={(v) => {
              setType(v ?? initialChartType);
            }}
          >
            <SelectTrigger
              aria-label="Chart type"
              className="demo-owned-chart-5 max-w-full"
              style={demoLayout5}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!circular && (
            <>
              <Select
                items={{ "3": "Last 3 months", "6": "Last 6 months" }}
                scale={scale}
                value={period}
                onValueChange={(value) => {
                  setPeriod(value ?? "");
                }}
              >
                <SelectTrigger
                  aria-label="Chart period"
                  className="demo-owned-chart-5 max-w-full"
                  style={demoLayout5}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="3">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
              <Select
                items={{
                  both: "Both devices",
                  desktop: "Desktop",
                  mobile: "Mobile",
                }}
                scale={scale}
                value={device}
                onValueChange={(value) => {
                  setDevice(value ?? "");
                }}
              >
                <SelectTrigger
                  aria-label="Chart devices"
                  className="demo-owned-chart-5 max-w-full"
                  style={demoLayout5}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both devices</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {copy(`${total.toLocaleString("en-US")} total visitors`)}
        <AnalyticsChartExample
          aria-label={
            circular
              ? "Browser visitor analytics"
              : "Monthly website visitor analytics"
          }
          type={type}
          data={data}
          config={config}
          series={series}
          scale={scale}
        />
        {copy("Illustrative data from the shadcn chart examples.")}
        {copy(
          "Inspect trends, compare series and explore the underlying data."
        )}
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Chart sample">Sample {step + 1}</output>
        <span>{types.find((t) => t.value === type)?.label}</span>
      </div>
    </>
  );
};

export { ChartDemo as default };
