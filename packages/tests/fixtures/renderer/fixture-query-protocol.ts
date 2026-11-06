import type { FpsChartExample } from "@grasscn/web/blocks/chart-fps";
import type { ProfilerChartExample } from "@grasscn/web/blocks/chart-profiler";
import type * as React from "react";

import type DraftDemos from "./draft-demos";

/** Adventure routes forward their decoded sample to DraftDemos and position the native subject. */
export type AdventureFixtureSample = React.ComponentProps<
  typeof DraftDemos
>["sample"] & {
  x?: number;
  y?: number;
};

interface PositionedChartQuery {
  scale?: React.ComponentProps<typeof FpsChartExample>["scale"];
  width?: React.ComponentProps<typeof FpsChartExample>["width"];
  x?: number;
  y?: number;
  background?: string;
}

/** The native FPS case producer supplies nanosecond samples and a frame-rate limit. */
interface FpsFixtureQuery extends PositionedChartQuery {
  element: "chart-fps";
  samples: number[];
  value?: React.ComponentProps<typeof FpsChartExample>["framerateLimit"];
}

/** The native profiler producer supplies parallel local/global shares for its labels. */
interface ProfilerFixtureQuery extends PositionedChartQuery {
  element: "chart-pie";
  rootName?: React.ComponentProps<typeof ProfilerChartExample>["rootName"];
  labels?: string[];
  globalPercentages: number[];
  percentages: number[];
}

/** Ordinary chart and metric callers omit the native case discriminator. */
interface DefaultChartQuery extends PositionedChartQuery {
  element?: undefined;
}

export type ChartFixtureQuery =
  | FpsFixtureQuery
  | ProfilerFixtureQuery
  | DefaultChartQuery;

/** String labels serialized by the owned menu, dialog and tab query producers. */
export type FixtureLabels = string[];
