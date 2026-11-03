"use client";

import * as React from "react";

import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftTooltipSprites as sprites } from "./minecraft-tooltip-sprites";

import "./minecraft-chart.css";

import {
  ChartFpsFrame as NativeChartFpsFrame,
  ChartProfilerFrame as NativeChartProfilerFrame,
  chartFpsColor as nativeChartFpsColor,
  chartProfilerColor as nativeChartProfilerColor,
} from "./minecraft-chart-native";

import {
  ChartPixelBar as NativeChartPixelBar,
  ChartProfilerSector as NativeChartProfilerSector,
  ChartPixelSurface as NativeChartPixelSurface,
  ChartAxisTick as NativeChartAxisTick,
} from "./minecraft-chart-context";

import * as RechartsPrimitive from "recharts";
import type { TooltipValueType } from "recharts";

import { ChartGeometryProvider } from "./minecraft-chart-context";

export {
  NativeChartFpsFrame as ChartFpsFrame,
  NativeChartProfilerFrame as ChartProfilerFrame,
  nativeChartFpsColor as chartFpsColor,
  nativeChartProfilerColor as chartProfilerColor,
};

export {
  NativeChartPixelBar as ChartPixelBar,
  NativeChartProfilerSector as ChartProfilerSector,
  NativeChartPixelSurface as ChartPixelSurface,
  NativeChartAxisTick as ChartAxisTick,
};

interface ChartScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { dark: ".dark", light: "" } as const;
const INITIAL_DIMENSION = { height: 200, width: 320 } as const;

type TooltipNameType = number | string;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | {
        color?: string;
        theme?: never;
      }
    | {
        color?: never;
        theme: Record<keyof typeof THEMES, string>;
      }
  )
>;

interface ChartContextProps {
  config: ChartConfig;
  scale: 1 | 2 | 3;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

const useChart = function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
};

const ChartContainer = ({
  id,
  className,
  children,
  style,
  ref,
  config,
  scale = 2,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  scale?: 1 | 2 | 3;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
  initialDimension?: {
    width: number;
    height: number;
  };
}) => {
  const host = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => host.current!, []);
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`;

  return (
    <ChartContext.Provider value={{ config, scale }}>
      <ChartGeometryProvider scale={scale} host={host} colors={config}>
        <div
          ref={host}
          id={id}
          data-slot="chart"
          data-chart={chartId}
          style={minecraftStyle(style, (__style): ChartScaleStyle => ({
            "--mc-scale": scale,
            ...__style,
          }))}
          className={cn(
            "mc-chart [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
            className
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer
            initialDimension={initialDimension}
          >
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartGeometryProvider>
    </ChartContext.Provider>
  );
};

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, seriesConfig]) => seriesConfig.theme ?? seriesConfig.color
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    // oxlint-disable-next-line shadcn/no-inline-styles -- Upstream ChartStyle emits scoped theme variables for runtime ChartConfig series names.
    <style
      // oxlint-disable-next-line react/no-danger -- Preserve upstream ChartStyle's per-chart theme-variable stylesheet.
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
      itemConfig.color;

    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
};

const ChartText = ({
  children,
  scale: explicitScale,
}: {
  children: React.ReactNode;
  scale?: 1 | 2 | 3;
}): React.ReactNode => {
  const { scale } = useChart();

  return isMinecraftTextContent(children) ? (
    <MinecraftDisclosureText scale={explicitScale ?? scale}>
      {children}
    </MinecraftDisclosureText>
  ) : (
    children
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = ({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >) => {
  const { config, scale } = useChart();
  const tooltipScale = scale === 3 ? 3 : 2;

  const tooltipStyle: React.CSSProperties & { "--mc-scale": number } = {
    "--mc-scale": tooltipScale,
  };

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);

    const value =
      !(labelKey ?? "") && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return (
      <div className={cn("font-medium", labelClassName)}>
        <ChartText scale={tooltipScale}>{value}</ChartText>
      </div>
    );
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
    tooltipScale,
  ]);

  if (!(active ?? false) || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      style={tooltipStyle}
      className={cn(
        "mc-chart-tooltip grid min-w-[8rem] items-start gap-1.5 text-xs [&>*:not(.mc-surface)]:relative",
        className
      )}
    >
      <MinecraftSurface sprite={sprites.background} />
      <MinecraftSurface sprite={sprites.frame} />
      {nestLabel ? null : tooltipLabel}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color;

            return (
              <div
                key={index}
                className={cn(
                  "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name != null ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 border-(--color-border) bg-(--color-bg)",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "my-0.5": nestLabel && indicator === "dashed",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "w-1": indicator === "line",
                            }
                          )}
                          style={
                            /* SAFETY: --color-bg, --color-border are this owner's CSS custom-property channels; this CSSProperties view passes the exact owned variable map to React without changing its values. */ {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between gap-[calc(4*var(--mc-pixel))] leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          <ChartText scale={tooltipScale}>
                            {itemConfig?.label ?? item.name}
                          </ChartText>
                        </span>
                      </div>
                      {item.value != null && (
                        <span className="text-foreground tabular-nums">
                          <ChartText scale={tooltipScale}>
                            {typeof item.value === "number"
                              ? item.value.toLocaleString()
                              : String(item.value)}
                          </ChartText>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = ({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "mc-chart-legend flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          let icon: React.ReactNode;

          if (itemConfig?.icon && !hideIcon) {
            icon = <itemConfig.icon />;
          } else {
            const swatchStyle: React.CSSProperties & {
              "--mc-chart-legend-color": string | undefined;
            } = { "--mc-chart-legend-color": item.color };

            icon = (
              <div
                className="mc-chart-legend-swatch h-2 w-2 shrink-0"
                style={swatchStyle}
              />
            );
          }

          return (
            <div
              key={index}
              className={cn(
                "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
              )}
            >
              {icon}
              <ChartText>{itemConfig?.label}</ChartText>
            </div>
          );
        })}
    </div>
  );
};

// Helper to extract item config from a payload.
const getPayloadConfigFromPayload = function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload];
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload];
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
};

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
