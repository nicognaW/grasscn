import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartPixelBar,
  ChartFpsFrame,
  ChartProfilerSector,
  ChartProfilerFrame,
  type ChartConfig,
} from "@grasscn/web/ui/chart";
import * as React from "react";
import { BarChart, Bar } from "recharts";
const config: ChartConfig = {
  count: {
    label: "世界",
    theme: { light: "green", dark: "lime" },
    icon: () => <svg />,
  },
};
export const api = (
  <ChartContainer
    ref={React.createRef<HTMLDivElement>()}
    scale={1}
    config={config}
    aria-label="Activity"
  >
    <BarChart data={[{ count: 1 }]}>
      <Bar dataKey="count" shape={ChartPixelBar} isAnimationActive={false} />
      <ChartFpsFrame labels={["1 min", "1 avg", "1 max"]} />
      <ChartTooltip
        content={
          <ChartTooltipContent
            hideIndicator
            indicator="dashed"
            formatter={(value, name) => <b>{`${name}:${value}`}</b>}
          />
        }
      />
      <ChartLegend
        content={<ChartLegendContent verticalAlign="top" hideIcon />}
      />
    </BarChart>
  </ChartContainer>
);
