"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import * as React from "react";
import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftTooltipSprites as sprites } from "./minecraft-tooltip-sprites";
import "./minecraft-chart.css";
export { MinecraftFpsChart, MinecraftMetricChart, MinecraftProfilerChart, } from "./minecraft-chart-native";
export type { MinecraftFpsChartProps, MinecraftMetricChartProps, MinecraftProfilerChartProps, MinecraftProfilerDatum, } from "./minecraft-chart-native";
import * as RechartsPrimitive from "recharts";
import type { TooltipValueType } from "recharts";
// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;
const INITIAL_DIMENSION = { width: 320, height: 200 } as const;
type TooltipNameType = number | string;
export type ChartConfig = Record<string, {
    label?: React.ReactNode;
    icon?: React.ComponentType;
} & ({
    color?: string;
    theme?: never;
} | {
    color?: never;
    theme: Record<keyof typeof THEMES, string>;
})>;
type ChartContextProps = {
    config: ChartConfig;
    scale: 1 | 2 | 3;
};
const ChartContext = React.createContext<ChartContextProps | null>(null);
function useChart() {
    const context = React.useContext(ChartContext);
    if (!context) {
        throw new Error("useChart must be used within a <ChartContainer />");
    }
    return context;
}
function ChartContainer({ id, className, children, style, config, scale = 2, initialDimension = INITIAL_DIMENSION, ...props }: React.ComponentProps<"div"> & {
    config: ChartConfig;
    scale?: 1 | 2 | 3;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
    initialDimension?: {
        width: number;
        height: number;
    };
}) {
    const uniqueId = React.useId();
    const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;
    return (<ChartContext.Provider value={{ config, scale }}>
      <div data-slot="chart" data-chart={chartId} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} className={cn("mc-chart flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden", className)} {...props}>
        <ChartStyle id={chartId} config={config}/>
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>);
}
const ChartStyle = ({ id, config }: {
    id: string;
    config: ChartConfig;
}) => {
    const colorConfig = Object.entries(config).filter(([, config]) => config.theme ?? config.color);
    if (!colorConfig.length) {
        return null;
    }
    return (<style dangerouslySetInnerHTML={{
            __html: Object.entries(THEMES)
                .map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
                .map(([key, itemConfig]) => {
                const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
                    itemConfig.color;
                return color ? `  --color-${key}: ${color};` : null;
            })
                .join("\n")}
}
`)
                .join("\n"),
        }}/>);
};
function ChartText({ children }: {
    children: React.ReactNode;
}) {
    const { scale } = useChart();
    return typeof children === "string" || typeof children === "number" ? (<MinecraftDisclosureText scale={scale}>{children}</MinecraftDisclosureText>) : (children);
}
const ChartTooltip = RechartsPrimitive.Tooltip;
function ChartTooltipContent({ active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey, }: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
} & Omit<RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>, "accessibilityLayer">) {
    const { config } = useChart();
    const tooltipLabel = React.useMemo(() => {
        if (hideLabel || !payload?.length) {
            return null;
        }
        const [item] = payload;
        const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        const value = !labelKey && typeof label === "string"
            ? (config[label]?.label ?? label)
            : itemConfig?.label;
        if (labelFormatter) {
            return (<div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>);
        }
        if (!value) {
            return null;
        }
        return (<div className={cn("font-medium", labelClassName)}>
        <ChartText>{value}</ChartText>
      </div>);
    }, [
        label,
        labelFormatter,
        payload,
        hideLabel,
        labelClassName,
        config,
        labelKey,
    ]);
    if (!active || !payload?.length) {
        return null;
    }
    const nestLabel = payload.length === 1 && indicator !== "dot";
    return (<div className={cn("mc-chart-tooltip grid min-w-[8rem] items-start gap-1.5 text-xs [&>*:not(.mc-surface)]:relative", className)}>
      <MinecraftSurface sprite={sprites.background}/>
      <MinecraftSurface sprite={sprites.frame}/>
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
            .filter((item) => item.type !== "none")
            .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color;
            return (<div key={index} className={cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center")}>
                {formatter && item?.value !== undefined && item.name != null ? (formatter(item.value, item.name, item, index, item.payload)) : (<>
                    {itemConfig?.icon ? (<itemConfig.icon />) : (!hideIndicator && (<div className={cn("shrink-0  border-(--color-border) bg-(--color-bg)", {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                        })} style={{
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                        } as React.CSSProperties}/>))}
                    <div className={cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          <ChartText>
                            {itemConfig?.label ?? item.name}
                          </ChartText>
                        </span>
                      </div>
                      {item.value != null && (<span className="font-mono font-medium text-foreground tabular-nums">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>)}
                    </div>
                  </>)}
              </div>);
        })}
      </div>
    </div>);
}
const ChartLegend = RechartsPrimitive.Legend;
function ChartLegendContent({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey, }: React.ComponentProps<"div"> & {
    hideIcon?: boolean;
    nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
    const { config } = useChart();
    if (!payload?.length) {
        return null;
    }
    return (<div className={cn("mc-chart-legend flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}>
      {payload
            .filter((item) => item.type !== "none")
            .map((item, index) => {
            const key = `${nameKey ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            return (<div key={index} className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}>
              {itemConfig?.icon && !hideIcon ? (<itemConfig.icon />) : (<div className="h-2 w-2 shrink-0 " style={{
                        backgroundColor: item.color,
                    }}/>)}
              <ChartText>{itemConfig?.label}</ChartText>
            </div>);
        })}
    </div>);
}
// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
    if (typeof payload !== "object" || payload === null) {
        return undefined;
    }
    const payloadPayload = "payload" in payload &&
        typeof payload.payload === "object" &&
        payload.payload !== null
        ? payload.payload
        : undefined;
    let configLabelKey: string = key;
    if (key in payload &&
        typeof payload[key as keyof typeof payload] === "string") {
        configLabelKey = payload[key as keyof typeof payload] as string;
    }
    else if (payloadPayload &&
        key in payloadPayload &&
        typeof payloadPayload[key as keyof typeof payloadPayload] === "string") {
        configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
    }
    return configLabelKey in config ? config[configLabelKey] : config[key];
}
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle, };
/** Web analytics composition. These additional geometries are not vanilla widgets. */
export type MinecraftChartType = "bar" | "stacked-bar" | "line" | "area" | "pie" | "donut" | "radar" | "radial";
export type MinecraftChartDatum = {
    name: string;
    [key: string]: string | number;
};
export type MinecraftChartProps = Omit<React.ComponentProps<"div">, "children" | "onSelect"> & {
    data: readonly MinecraftChartDatum[];
    config: ChartConfig;
    series: readonly string[];
    type?: MinecraftChartType;
    scale?: 1 | 2 | 3;
    height?: number;
    onValueChange?: (datum: MinecraftChartDatum, index: number) => void;
};
const ANALYTICS_COLORS = ["#55ff55", "#5555ff", "#ffff55", "#ff5555", "#55ffff", "#ff55ff"];
type PixelLabel = {
    text: string;
    x: number;
    y: number;
    align?: "left" | "center";
};
function MinecraftChart({ data, config, series, type = "bar", scale = 2, height = 140, onValueChange, className, style, ref, onKeyDown, onPointerMove, onPointerLeave, onFocus, onBlur, "aria-label": ariaLabel = "Analytics chart", ...props }: MinecraftChartProps) {
    const host = React.useRef<HTMLDivElement>(null), canvas = React.useRef<HTMLCanvasElement>(null);
    const [width, setWidth] = React.useState(280), [active, setActive] = React.useState<number | null>(null);
    const [labels, setLabels] = React.useState<PixelLabel[]>([]), [ready, setReady] = React.useState(false);
    const keyboard = React.useRef(false), detailsId = React.useId();
    React.useImperativeHandle(ref, () => host.current!, []);
    const logicalHeight = Math.max(100, Math.floor(height));
    const keys = series.filter(key => key in config);
    const color = (key: string, index: number) => {
        const theme = host.current?.closest(".dark") ? "dark" : "light";
        const fallback = ANALYTICS_COLORS[index % ANALYTICS_COLORS.length];
        let ink = config[key]?.color ?? config[key]?.theme?.[theme] ?? fallback;
        // Canvas does not resolve CSS custom properties itself, unlike Recharts/SVG.
        for (let attempt = 0; attempt < 4 && /^var\(/.test(ink); attempt++) {
            const match = /^var\(\s*(--[^,)]+)(?:,\s*([^)]*))?\)$/.exec(ink);
            ink = match && host.current ? getComputedStyle(host.current).getPropertyValue(match[1]).trim() || match[2]?.trim() || fallback : fallback;
        }
        return ink;
    };
    const value = (row: MinecraftChartDatum, key: string) => {
        const n = Number(row[key]);
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    };
    const choose = (index: number) => {
        if (!data.length)
            return;
        const next = Math.max(0, Math.min(data.length - 1, index));
        setActive(next);
        onValueChange?.(data[next], next);
    };
    React.useLayoutEffect(() => {
        const measure = () => setWidth(Math.max(80, Math.floor((host.current?.clientWidth ?? 560) / scale)));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(host.current!);
        return () => observer.disconnect();
    }, [scale]);
    React.useEffect(() => { setActive(null); }, [data, type]);
    React.useLayoutEffect(() => {
        const ctx = canvas.current?.getContext("2d");
        if (!ctx)
            return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, logicalHeight);
        const text: PixelLabel[] = [], left = 26, right = width - 6, top = 6, bottom = logicalHeight - 18;
        const pw = right - left, ph = bottom - top;
        const rect = (x: number, y: number, w: number, h: number, ink: string) => {
            ctx.fillStyle = ink;
            ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
        };
        // Bresenham and scanline fills use only integer pixel rectangles. No antialiased paths.
        const line = (x0: number, y0: number, x1: number, y1: number, ink: string) => {
            x0 = Math.round(x0);
            y0 = Math.round(y0);
            x1 = Math.round(x1);
            y1 = Math.round(y1);
            const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
            let error = dx + dy;
            for (;;) {
                rect(x0, y0, 1, 1, ink);
                if (x0 === x1 && y0 === y1)
                    break;
                const twice = error * 2;
                if (twice >= dy) {
                    error += dy;
                    x0 += sx;
                }
                if (twice <= dx) {
                    error += dx;
                    y0 += sy;
                }
            }
        };
        const polygon = (points: number[][], ink: string) => {
            for (let y = Math.max(0, Math.floor(Math.min(...points.map(p => p[1])))); y <= Math.min(logicalHeight - 1, Math.ceil(Math.max(...points.map(p => p[1])))); y++) {
                const cuts: number[] = [];
                points.forEach((a, i) => {
                    const b = points[(i + 1) % points.length];
                    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
                        cuts.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
                });
                cuts.sort((a, b) => a - b);
                for (let i = 0; i + 1 < cuts.length; i += 2)
                    rect(Math.ceil(cuts[i]), y, Math.floor(cuts[i + 1]) - Math.ceil(cuts[i]) + 1, 1, ink);
            }
        };
        const circular = ["pie", "donut", "radial"].includes(type);
        if (data.length && keys.length && circular) {
            const cx = Math.floor(width / 2), cy = Math.floor(logicalHeight / 2), radius = Math.floor(Math.min(width / 2 - 8, logicalHeight / 2 - 8));
            const total = data.reduce((sum, row) => sum + value(row, keys[0]), 0);
            const sum = data.map((_, i) => data.slice(0, i + 1).reduce((s, row) => s + value(row, keys[0]), 0));
            const maximum = Math.max(1, ...data.map(row => value(row, keys[0])));
            for (let y = -radius; y <= radius; y++)
                for (let x = -radius; x <= radius; x++) {
                    const d = x * x + y * y;
                    if (d > radius * radius)
                        continue;
                    const angle = (Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
                    if (type === "radial") {
                        const band = Math.floor((radius - Math.sqrt(d)) / Math.max(1, radius / data.length));
                        if (band >= data.length || Math.floor(Math.sqrt(d)) % Math.max(2, Math.floor(radius / data.length)) === 0)
                            continue;
                        rect(cx + x, cy + y, 1, 1, angle <= value(data[band], keys[0]) / maximum ? ANALYTICS_COLORS[band % 6] : "#555555");
                    }
                    else {
                        if (type === "donut" && d < (radius * .55) ** 2)
                            continue;
                        const index = total ? sum.findIndex(s => angle * total < s) : -1;
                        if (index >= 0)
                            rect(cx + x, cy + y, 1, 1, ANALYTICS_COLORS[index % 6]);
                    }
                }
        }
        else if (data.length && keys.length && type === "radar") {
            const cx = Math.floor(width / 2), cy = Math.floor(logicalHeight / 2), radius = Math.floor(Math.min(width / 2 - 28, logicalHeight / 2 - 17));
            const point = (i: number, r: number) => [Math.round(cx + Math.sin(i * Math.PI * 2 / data.length) * r), Math.round(cy - Math.cos(i * Math.PI * 2 / data.length) * r)];
            for (const ratio of [.25, .5, .75, 1])
                data.forEach((_, i) => { const a = point(i, radius * ratio), b = point((i + 1) % data.length, radius * ratio); line(a[0], a[1], b[0], b[1], "#555555"); });
            const max = Math.max(1, ...data.flatMap(row => keys.map(key => value(row, key))));
            data.forEach((row, i) => { const p = point(i, radius), label = point(i, radius + 9); line(cx, cy, p[0], p[1], "#555555"); text.push({ text: row.name.slice(0, 3), x: label[0], y: label[1] - 4, align: "center" }); });
            keys.forEach((key, k) => { const points = data.map((row, i) => point(i, radius * value(row, key) / max)); points.forEach((p, i) => { const n = points[(i + 1) % points.length]; line(p[0], p[1], n[0], n[1], color(key, k)); rect(p[0] - 1, p[1] - 1, 3, 3, color(key, k)); }); });
        }
        else if (data.length && keys.length) {
            const rawMax = Math.max(1, ...data.map(row => type === "stacked-bar" ? keys.reduce((sum, key) => sum + value(row, key), 0) : Math.max(...keys.map(key => value(row, key)))));
            const max = Math.ceil(rawMax / 100) * 100;
            for (let i = 0; i <= 4; i++) {
                const y = Math.round(bottom - ph * i / 4);
                line(left, y, right, y, i === 0 ? "#ffffff" : "#555555");
                text.push({ text: max * i / 4 >= 1000 ? `${Math.round(max * i / 4 / 100) / 10}k` : String(Math.round(max * i / 4)), x: 0, y: y - 4 });
            }
            const cell = pw / data.length;
            const center = (i: number) => Math.round(left + cell * (i + .5));
            const ty = (n: number) => Math.round(bottom - ph * n / max);
            data.forEach((row, i) => {
                // Keep tick labels from colliding on narrow/mobile charts.
                const every = Math.max(1, Math.ceil(data.length * 24 / pw));
                if (i % every === 0)
                    text.push({ text: row.name.slice(0, 3), x: center(i), y: bottom + 6, align: "center" });
            });
            keys.forEach((key, k) => {
                const ink = color(key, k), points = data.map((row, i) => [center(i), ty(value(row, key))]);
                if (type === "line" || type === "area") {
                    if (type === "area") {
                        ctx.globalAlpha = .25;
                        polygon([[points[0][0], bottom], ...points, [points.at(-1)![0], bottom]], ink);
                        ctx.globalAlpha = 1;
                    }
                    points.forEach((p, i) => { if (i)
                        line(points[i - 1][0], points[i - 1][1], p[0], p[1], ink); rect(p[0] - 1, p[1] - 1, 3, 3, ink); });
                }
                else
                    data.forEach((row, i) => {
                        const bw = Math.max(1, Math.floor((cell - 4) / (type === "stacked-bar" ? 1 : keys.length)));
                        const base = type === "stacked-bar" ? keys.slice(0, k).reduce((sum, previous) => sum + value(row, previous), 0) : 0;
                        const x = Math.round(left + cell * i + 2 + (type === "stacked-bar" ? 0 : k * bw)), y = ty(base + value(row, key));
                        if (value(row, key) > 0)
                            rect(x, y, bw, ty(base) - y, ink);
                    });
            });
            if (active != null && data[active]) {
                const x = center(active);
                for (let y = top; y < bottom; y += 3)
                    rect(x, y, 1, 1, "#ffffff");
            }
        }
        setLabels(text);
        setReady(true);
    }, [data, config, series, type, scale, width, logicalHeight, active]);
    const isPolar = ["pie", "donut", "radial", "radar"].includes(type);
    const indexAtPointer = (event: React.PointerEvent<HTMLDivElement>) => {
        const bounds = canvas.current!.getBoundingClientRect(), x = (event.clientX - bounds.left) / scale, y = (event.clientY - bounds.top) / scale;
        if (isPolar) {
            const dx = x - width / 2, dy = y - logicalHeight / 2;
            const angle = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
            if (type === "radial")
                return Math.floor((Math.min(width / 2 - 8, logicalHeight / 2 - 8) - Math.hypot(dx, dy)) / Math.max(1, Math.min(width / 2 - 8, logicalHeight / 2 - 8) / data.length));
            if (type === "radar")
                return Math.round(angle * data.length) % data.length;
            const total = data.reduce((sum, row) => sum + value(row, keys[0]), 0);
            let acc = 0;
            return data.findIndex(row => { acc += value(row, keys[0]); return angle * total < acc; });
        }
        return Math.floor((x - 26) / Math.max(1, width - 32) * data.length);
    };
    return <ChartContext.Provider value={{ config, scale }}><div {...props} ref={host} data-slot="pixel-chart" data-chart-type={type} data-mc-ready={ready} data-mc-rendering="pixel-composition" className={cn("mc-pixel-chart", className)} style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))}>
    <div className="mc-pixel-chart-plot" tabIndex={0} role="img" aria-label={ariaLabel} aria-describedby={detailsId} onFocus={event => { keyboard.current = true; if (active == null)
        choose(0); onFocus?.(event); }} onBlur={event => { keyboard.current = false; setActive(null); onBlur?.(event); }} onPointerMove={event => { if (data.length && keys.length)
        choose(indexAtPointer(event)); onPointerMove?.(event); }} onPointerLeave={event => { if (!keyboard.current)
        setActive(null); onPointerLeave?.(event); }} onKeyDown={event => {
            onKeyDown?.(event);
            if (event.defaultPrevented || !data.length)
                return;
            const next = event.key === "Home" ? 0 : event.key === "End" ? data.length - 1 : event.key === "ArrowRight" || event.key === "ArrowDown" ? (active ?? -1) + 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (active ?? 1) - 1 : null;
            if (next != null) {
                event.preventDefault();
                choose(next);
            }
            if (event.key === "Escape")
                setActive(null);
        }}>
      <canvas ref={canvas} width={width} height={logicalHeight} style={{ width: width * scale, height: logicalHeight * scale }} aria-hidden="true"/>
      {labels.map((label, i) => <span aria-hidden="true" key={i} className="mc-pixel-chart-label" style={{ left: (label.align === "center" ? label.x - 12 : label.x) * scale, top: label.y * scale }}><MinecraftDisclosureText scale={scale} maxWidth={label.align === "center" ? 24 : undefined} align={label.align}>{label.text}</MinecraftDisclosureText></span>)}
      {!data.length || !keys.length ? <div className="mc-pixel-chart-empty"><MinecraftDisclosureText scale={scale}>No data</MinecraftDisclosureText></div> : null}
    </div>
    <div className="mc-pixel-chart-key">{(isPolar && type !== "radar" ? data.map((row, i) => ({ key: row.name, label: row.name, color: ANALYTICS_COLORS[i % 6] })) : keys.map((key, i) => ({ key, label: config[key]?.label ?? key, color: color(key, i) }))).map(item => <span key={item.key}><i style={{ background: item.color }}/><ChartText>{item.label}</ChartText></span>)}</div>
    <div className="mc-pixel-chart-readout" aria-live="polite" aria-atomic="true"><MinecraftDisclosureText scale={scale} maxWidth={width}>{active != null && data[active] ? `${data[active].name}: ${keys.map(key => `${typeof config[key]?.label === "string" ? config[key].label : key} ${value(data[active], key).toLocaleString("en-US")}`).join(" / ")}` : "Hover or use arrow keys to inspect"}</MinecraftDisclosureText></div>
    <details className="mc-pixel-chart-data" id={detailsId}><summary><ChartText>View chart data</ChartText></summary><div><table><caption><ChartText>{ariaLabel}</ChartText></caption><thead><tr><th scope="col"><ChartText>Category</ChartText></th>{keys.map(key => <th key={key} scope="col"><ChartText>{config[key]?.label ?? key}</ChartText></th>)}</tr></thead><tbody>{data.map((row, i) => <tr key={i}><th scope="row"><ChartText>{row.name}</ChartText></th>{keys.map(key => <td key={key}><ChartText>{value(row, key)}</ChartText></td>)}</tr>)}</tbody></table></div></details>
  </div></ChartContext.Provider>;
}
export { MinecraftChart };
