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
  { name: "January", desktop: 186, mobile: 80 },
  { name: "February", desktop: 305, mobile: 200 },
  { name: "March", desktop: 237, mobile: 120 },
  { name: "April", desktop: 73, mobile: 190 },
  { name: "May", desktop: 209, mobile: 130 },
  { name: "June", desktop: 214, mobile: 140 },
];

const browsers = [
  { name: "Chrome", visitors: 275 },
  { name: "Safari", visitors: 200 },
  { name: "Firefox", visitors: 187 },
  { name: "Edge", visitors: 173 },
  { name: "Other", visitors: 90 },
];

const config: ChartConfig = {
  desktop: { label: "Desktop", color: "#55ff55" },
  mobile: { label: "Mobile", color: "#5555ff" },
  visitors: { label: "Visitors", color: "#55ff55" },
};

const types: {
  value: AnalyticsChartType;
  label: string;
}[] = [
  { value: "bar", label: "Bar" },
  { value: "stacked-bar", label: "Stacked bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "donut", label: "Donut" },
  { value: "radar", label: "Radar" },
  { value: "radial", label: "Radial" },
];

const ChartDemo = ({ scale }: DemoProps) => {
  const stage = React.useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = React.useState(80);

  React.useLayoutEffect(() => {
    const measure = () => {
      const node = stage.current!;
      const css = getComputedStyle(node);
      setContentWidth(
        Math.max(
          40,
          Math.floor(
            (node.clientWidth -
              parseFloat(css.paddingLeft) -
              parseFloat(css.paddingRight)) /
              scale
          )
        )
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage.current!);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  const copy = (text: string) => (
    <MinecraftDisclosureText scale={scale} maxWidth={contentWidth}>
      {text}
    </MinecraftDisclosureText>
  );

  const [type, setType] = React.useState<AnalyticsChartType>("area");
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

    const total = rows.reduce((sum, row) => sum + row.visitors, 0);

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

  const data = React.useMemo(
    () => (circular ? browsers : visitors.slice(-Number(period))),
    [circular, period]
  );

  const series = React.useMemo(
    () =>
      circular
        ? ["visitors"]
        : device === "both"
          ? ["desktop", "mobile"]
          : [device],
    [circular, device]
  );

  const total = data.reduce(
    (n, row) =>
      n +
      series.reduce(
        (s, key) => s + Number((row as Record<string, string | number>)[key]),
        0
      ),
    0
  );

  return (
    <>
      <div
        ref={stage}
        className="demo-stage demo-stage-display-flex demo-stage-flex-wrap-nowrap demo-stage-align-items-stretch demo-stage-min-width-0 flex-col"
        data-stage="chart"
        style={
          /* SAFETY: satisfies checks --mc-scale, --demo-stage-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--mc-scale": scale,
            "--demo-stage-gap": `${10 * scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
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
                style={{
                  width: Math.min(116, contentWidth) * scale,
                  maxWidth: "100%",
                }}
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
              className="max-w-full"
              style={{
                width: Math.min(100, contentWidth) * scale,
              }}
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
                metric === "latency"
                  ? "API response time"
                  : "Requests per minute"
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
                      { value: 300, label: "300 ms" },
                      { value: 150, label: "150 ms" },
                    ]
                  : [
                      { value: 80, label: "80 req" },
                      { value: 40, label: "40 req" },
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
              className="max-w-full"
              style={{
                width: Math.min(120, contentWidth) * scale,
              }}
              onClick={() => {
                setStep((v) => v + 1);
              }}
            >
              Next sample
            </Button>
            <Button
              scale={scale}
              type="button"
              className="max-w-full"
              style={{
                width: Math.min(100, contentWidth) * scale,
              }}
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
          <Select
            items={types}
            scale={scale}
            value={type}
            onValueChange={(v) => {
              setType(v as AnalyticsChartType);
            }}
          >
            <SelectTrigger
              aria-label="Chart type"
              style={{
                width: Math.min(116, contentWidth) * scale,
                maxWidth: "100%",
              }}
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
                items={{ "6": "Last 6 months", "3": "Last 3 months" }}
                scale={scale}
                value={period}
                onValueChange={(value) => {
                  setPeriod(value ?? "");
                }}
              >
                <SelectTrigger
                  aria-label="Chart period"
                  style={{
                    width: Math.min(116, contentWidth) * scale,
                    maxWidth: "100%",
                  }}
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
                  style={{
                    width: Math.min(116, contentWidth) * scale,
                    maxWidth: "100%",
                  }}
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
