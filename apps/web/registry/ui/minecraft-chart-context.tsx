"use client";

import * as React from "react";
import {
  Rectangle,
  Sector,
  useChartWidth,
  useChartHeight,
  usePlotArea,
} from "recharts";
// oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- These are Recharts' published renderer-prop type names.
import type { BarShapeProps, PieSectorShapeProps } from "recharts";

import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import { minecraftGlyphs } from "./minecraft-font";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

type Geometry =
  | {
      kind: "bar";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      index: number;
      value: number;
    }
  | {
      kind: "sector";
      cx: number;
      cy: number;
      outerRadius: number;
      innerRadius: number;
      startAngle: number;
      endAngle: number;
      percent: number;
      index: number;
      name: string;
      globalPercentage?: number;
      fill: string;
    };

interface ProfilerRow {
  fill: string;
  globalPercentage: number | undefined;
  name: string;
  percentage: number;
  start: number;
  sweep: number;
}

interface GeometrySnapshot {
  entries: Geometry[];
  profilerData: ProfilerRow[];
  revision: number;
}

const createGeometryStore = () => {
  const entries = new Map<string, Geometry>();
  const listeners = new Set<() => void>();

  const initialSnapshot: GeometrySnapshot = {
    entries: [],
    profilerData: [],
    revision: 0,
  };

  let snapshot = initialSnapshot;
  let profilerKey = "[]";

  const invalidate = () => {
    const nextEntries = [...entries.values()].sort((a, b) => a.index - b.index);
    const sectors = nextEntries.filter((item) => item.kind === "sector");
    const nextProfilerKey = JSON.stringify(sectors);

    const profilerData =
      nextProfilerKey === profilerKey
        ? snapshot.profilerData
        : sectors.map((item) => ({
            fill: item.fill,
            globalPercentage: item.globalPercentage,
            name: item.name,
            percentage: item.percent * 100,
            start: ((item.startAngle + 90) / 360) * 100,
            sweep: ((item.endAngle - item.startAngle) / 360) * 100,
          }));

    profilerKey = nextProfilerKey;
    snapshot = {
      entries: nextEntries,
      profilerData,
      revision: snapshot.revision + 1,
    };

    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getServerSnapshot: () => initialSnapshot,
    getSnapshot: () => snapshot,
    invalidate,
    remove: (id: string) => {
      entries.delete(id);
      invalidate();
    },
    set: (id: string, geometry: Geometry) => {
      entries.set(id, geometry);
      invalidate();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

interface GeometryContext {
  store: ReturnType<typeof createGeometryStore>;
  scale: 1 | 2 | 3;
}

const Context = React.createContext<GeometryContext | null>(null);

export const chartColorChannels = function chartColorChannels(
  color: string,
  element?: Element | null
): number[] {
  let resolvedColor = color;

  const variable =
    /^var\(\s*(?<customProperty>--[^,)]+)(?:,\s*(?<fallback>[^)]*))?\)/u.exec(
      resolvedColor
    );

  if (variable) {
    resolvedColor =
      (element
        ? getComputedStyle(element).getPropertyValue(variable[1]).trim()
        : "") ||
      variable[2] ||
      "#55ff55";
  }

  if (/^#[\da-f]{6}$/iu.test(resolvedColor)) {
    return [1, 3, 5].map((index) =>
      Number.parseInt(resolvedColor.slice(index, index + 2), 16)
    );
  }

  if (/^#[\da-f]{3}$/iu.test(resolvedColor)) {
    return [1, 2, 3].map((index) =>
      Number.parseInt(resolvedColor[index] + resolvedColor[index], 16)
    );
  }

  if (resolvedColor.startsWith("rgb")) {
    return (resolvedColor.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Minecraft chart context 2D canvas context could not be created"
    );
  }

  context.fillStyle = resolvedColor;
  context.fillRect(0, 0, 1, 1);

  return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
};

export const ChartGeometryProvider = ({
  scale,
  children,
  host,
  colors,
}: {
  scale: 1 | 2 | 3;
  children: React.ReactNode;
  host: React.RefObject<HTMLDivElement | null>;
  colors: unknown;
}) => {
  const [store] = React.useState(createGeometryStore);
  const context = React.useMemo(() => ({ scale, store }), [scale, store]);

  React.useLayoutEffect(() => {
    store.invalidate();
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Colors and scale change rendered geometry/style ownership; invalidate the existing shared geometry store after their commit.
  }, [store, colors, scale]);
  React.useLayoutEffect(() => {
    const observer = new MutationObserver(() => {
      store.invalidate();
    });

    for (
      let node: HTMLElement | null = host.current;
      node;
      node = node.parentElement
    ) {
      observer.observe(node, {
        attributeFilter: ["class", "style", "data-theme"],
        attributes: true,
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [store, host]);

  return <Context.Provider value={context}>{children}</Context.Provider>;
};

const useStore = function useStore() {
  const store = React.useContext(Context);

  if (!store) {
    throw new Error("Pixel chart parts require ChartContainer");
  }

  return store;
};

export const useChartGeometry = function useChartGeometry() {
  const { scale, store } = useStore();

  const snapshot = React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  return {
    ...snapshot,
    scale,
  };
};

export const ChartAxisTick = ({
  x = 0,
  y = 0,
  dy = 0,
  payload,
  textAnchor = "middle",
  tickFormatter = String,
}: {
  x?: number | string;
  y?: number | string;
  dy?: number | string;
  payload?: { value?: string | number };
  textAnchor?: string;
  tickFormatter?: (value: string | number) => string;
}) => {
  const { scale } = useChartGeometry();
  const text = tickFormatter(payload?.value ?? "");
  const [, refresh] = React.useReducer((value) => value + 1, 0);

  React.useEffect(() => {
    let live = true;

    if (/[^\u0020-\u007E]/u.test(text)) {
      const fontLoading = loadUnihex();

      const commitFontReadiness = async () => {
        await fontLoading;

        if (live) {
          refresh();
        }
      };

      void commitFontReadiness();
    }

    return () => {
      live = false;
    };
  }, [text]);

  let accumulatedGlyphAdvance = 0;

  for (const advanceCharacter of text) {
    // SAFETY: for-of yields a nonempty code-point string; the owned bitmap has only ASCII 32..126 entries, so supplementary characters miss it under both index forms and retain the same Unihex fallback.
    /* oxlint-disable typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this exact codePointAt(0) result. */
    accumulatedGlyphAdvance +=
      minecraftGlyphs[(advanceCharacter.codePointAt(0) as number) - 32]?.[2] ??
      getUnihexGlyph(advanceCharacter)?.advance ??
      10;
    /* oxlint-enable typescript/no-unsafe-type-assertion */
  }

  const width = accumulatedGlyphAdvance;

  const position = Math.round(Number(x) / scale);
  let anchorOffset = 0;

  if (textAnchor === "end") {
    anchorOffset = width;
  } else if (textAnchor === "middle") {
    anchorOffset = Math.floor(width / 2);
  }

  const left = position - anchorOffset;

  return (
    <foreignObject
      x={left * scale}
      y={(Math.round((Number(y) + Number(dy)) / scale) - 4) * scale}
      width={(width + 1) * scale}
      height={10 * scale}
      pointerEvents="none"
    >
      <MinecraftDisclosureText scale={scale}>{text}</MinecraftDisclosureText>
    </foreignObject>
  );
};

const useRegister = function useRegister(geometry: Geometry) {
  const { store } = useStore();
  const id = React.useId();
  const serialized = JSON.stringify(geometry);

  React.useLayoutEffect(() => {
    // SAFETY: serialized was produced immediately above from this hook's Geometry input.
    store.set(id, JSON.parse(serialized) as Geometry);

    return () => {
      store.remove(id);
    };
  }, [store, id, serialized]);
};

// oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Keep the actual Recharts renderer-prop contract.
const PixelBarGeometry = (props: BarShapeProps) => {
  useRegister({
    fill: props.fill ?? "#55ff55",
    height: props.height,
    index: props.index,
    kind: "bar",
    value: Number(props.value),
    width: props.width,
    x: props.x,
    y: props.y,
  });

  return <Rectangle {...props} fill="transparent" stroke="none" />;
};

/** Recharts owns the coordinates, scales, stacking, hit testing and tooltip state. */
// oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Keep the actual Recharts renderer-prop contract.
export const ChartPixelBar = (props: BarShapeProps) => (
  <PixelBarGeometry {...props} />
);

// oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Keep the actual Recharts sector renderer-prop contract.
const ProfilerSectorGeometry = (props: PieSectorShapeProps) => {
  useRegister({
    cx: props.cx,
    cy: props.cy,
    endAngle: props.endAngle,
    fill: props.fill ?? "#55ff55",
    globalPercentage: props.payload?.globalPercentage,
    index: props.index,
    innerRadius: props.innerRadius,
    kind: "sector",
    name: props.name ?? "",
    outerRadius: props.outerRadius,
    percent: props.percent ?? 0,
    startAngle: props.startAngle,
  });

  return (
    <Sector
      {...props}
      transform={`translate(0 ${props.cy / 2}) scale(1 .5)`}
      fill="transparent"
      stroke="none"
    />
  );
};

/** A Pie shape adapter, not a second Pie implementation or data API. */
// oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Keep the actual Recharts sector renderer-prop contract.
export const ChartProfilerSector = (props: PieSectorShapeProps) => (
  <ProfilerSectorGeometry {...props} />
);

/** Own the mask and one-pixel color planes for one target chart canvas. */
const createChartRasterSurfaces = function createChartRasterSurfaces(
  node: HTMLCanvasElement
) {
  const scratch = document.createElement("canvas");
  scratch.width = node.width;
  scratch.height = node.height;

  const mask = scratch.getContext("2d");

  if (!mask) {
    throw new Error(
      "Minecraft chart context 2D canvas context could not be created"
    );
  }

  const colorCanvas = document.createElement("canvas");

  colorCanvas.height = 1;
  colorCanvas.width = 1;

  const colorContext = colorCanvas.getContext("2d");

  if (!colorContext) {
    throw new Error(
      "Minecraft chart context 2D canvas context could not be created"
    );
  }

  return { colorContext, mask, scratch };
};

/** Quantize Recharts' rendered SVG geometry; Recharts retains every data and layout API. */
export const ChartPixelSurface = ({
  background = "#202020",
}: {
  background?: string;
}) => {
  const { scale, revision } = useChartGeometry();
  const chartWidth = useChartWidth() ?? 0;
  const chartHeight = useChartHeight() ?? 0;
  const plot = usePlotArea();

  const x = plot?.x ?? 0;
  const y = plot?.y ?? 0;
  const width = plot?.width ?? chartWidth;
  const height = plot?.height ?? chartHeight;

  const canvas = React.useRef<HTMLCanvasElement>(null);
  const [paint, setPaint] = React.useState(0);
  const [ready, setReady] = React.useState(false);

  const backgroundStyle: React.CSSProperties & {
    "--mc-chart-surface-background": string;
  } = { "--mc-chart-surface-background": background };

  const canvasStyle: React.CSSProperties & {
    "--mc-chart-surface-height": number;
    "--mc-chart-surface-width": number;
  } = {
    "--mc-chart-surface-height":
      Math.max(1, Math.floor(height / scale)) * scale,
    "--mc-chart-surface-width": Math.max(1, Math.floor(width / scale)) * scale,
  };

  React.useLayoutEffect((): (() => void) | undefined => {
    const svg = canvas.current?.closest("svg.recharts-surface");

    if (!svg) {
      return undefined;
    }

    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.target instanceof SVGElement &&
            !record.target.closest("foreignObject")
        )
      ) {
        setPaint((value) => value + 1);
      }
    });

    observer.observe(svg, { attributes: true, childList: true, subtree: true });

    return () => {
      observer.disconnect();

      for (const element of svg.querySelectorAll("[data-mc-pixel-source]")) {
        element.removeAttribute("data-mc-pixel-source");
      }
    };
  }, []);
  React.useLayoutEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext("2d");
    const svg = node?.closest<SVGSVGElement>("svg.recharts-surface");

    if (!node || !ctx || !svg) {
      return;
    }

    node.width = Math.max(1, Math.floor(width / scale));
    node.height = Math.max(1, Math.floor(height / scale));
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, node.width, node.height);
    const { colorContext, mask, scratch } = createChartRasterSurfaces(node);

    const colors = new Map<string, { ink: string; alpha: number }>();

    const color = (value: string) => {
      if (!value || value === "none") {
        return null;
      }

      const cached = colors.get(value);

      if (cached) {
        return cached;
      }

      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = value;
      colorContext.fillRect(0, 0, 1, 1);
      const c = colorContext.getImageData(0, 0, 1, 1).data;

      const parsed = {
        alpha: c[3] / 255,
        ink: `rgb(${c[0]},${c[1]},${c[2]})`,
      };

      colors.set(value, parsed);

      return parsed;
    };

    const selector =
      ".recharts-rectangle,.recharts-curve,.recharts-sector,.recharts-polygon,.recharts-dot,.recharts-cartesian-grid line,.recharts-polar-grid path,.recharts-polar-grid line,.recharts-polar-grid polygon,.recharts-polar-grid circle";

    let count = 0;

    const readInheritedVisibility = (element: SVGGraphicsElement) => {
      let opacity = 1;
      let visible = true;

      for (
        let parent: Element | null = element;
        parent && parent !== svg;
        parent = parent.parentElement
      ) {
        const s = getComputedStyle(parent);

        if (s.display === "none" || s.visibility === "hidden") {
          visible = false;
          break;
        }

        opacity *= Number(s.opacity);
      }

      return { opacity, visible };
    };

    const rasterizeElement = (element: SVGGraphicsElement) => {
      if (element.closest("foreignObject,defs")) {
        return;
      }

      // Keep the real SVG shapes for Recharts interaction; only the pixel surface paints them.
      if (!Object.hasOwn(element.dataset, "mcPixelSource")) {
        element.dataset.mcPixelSource = "";
      }

      const style = getComputedStyle(element);

      const { opacity, visible } = readInheritedVisibility(element);

      if (!visible || opacity === 0) {
        return;
      }

      const path = new Path2D();
      const n = (name: string) => Number(element.getAttribute(name) ?? 0);
      const tag = element.tagName.toLowerCase();

      if (tag === "path") {
        const d = element.getAttribute("d");

        if (d === null || d === "") {
          return;
        }

        path.addPath(new Path2D(d));
      } else if (tag === "line") {
        path.moveTo(n("x1"), n("y1"));
        path.lineTo(n("x2"), n("y2"));
      } else if (tag === "circle") {
        if (![n("cx"), n("cy"), n("r")].every(Number.isFinite)) {
          return;
        }

        path.arc(n("cx"), n("cy"), Math.max(0, n("r")), 0, Math.PI * 2);
      } else if (tag === "rect") {
        path.rect(n("x"), n("y"), n("width"), n("height"));
      } else if (tag === "polygon" || tag === "polyline") {
        const points = (
          element
            .getAttribute("points")
            ?.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/gu) ?? []
        ).map(Number);

        for (let i = 0; i + 1 < points.length; i += 2) {
          if (i) {
            path.lineTo(points[i], points[i + 1]);
          } else {
            path.moveTo(points[i], points[i + 1]);
          }
        }

        if (tag === "polygon") {
          path.closePath();
        }
      } else {
        return;
      }

      const rootMatrix = svg.getCTM();
      const matrix = element.getCTM();

      const stamp = (value: string, alpha: number, stroke: boolean) => {
        const ink = color(value);

        if (!ink || ink.alpha === 0 || alpha === 0) {
          return;
        }

        mask.setTransform(1, 0, 0, 1, 0, 0);
        mask.clearRect(0, 0, scratch.width, scratch.height);
        mask.setTransform(
          1 / scale,
          0,
          0,
          1 / scale,
          -Math.floor(x / scale),
          -Math.floor(y / scale)
        );

        if (rootMatrix && matrix) {
          const relative = rootMatrix.inverse().multiply(matrix);
          mask.transform(
            relative.a,
            relative.b,
            relative.c,
            relative.d,
            relative.e,
            relative.f
          );
        }

        if (stroke) {
          mask.strokeStyle = ink.ink;
          mask.lineWidth = Math.max(
            scale,
            // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
            Math.round(Number.parseFloat(style.strokeWidth) / scale) * scale
          );
          mask.setLineDash(
            style.strokeDasharray === "none"
              ? []
              : style.strokeDasharray
                  .split(/[ ,]+/u)
                  // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
                  .map((dashToken) => Number.parseFloat(dashToken))
          );
          mask.stroke(path);
        } else {
          mask.fillStyle = ink.ink;
          // oxlint-disable-next-line unicorn/no-array-fill-with-reference-type -- Canvas fills a Path2D; this is not Array.fill.
          mask.fill(path, style.fillRule === "evenodd" ? "evenodd" : "nonzero");
        }

        const image = mask.getImageData(0, 0, scratch.width, scratch.height);

        for (let i = 3; i < image.data.length; i += 4) {
          image.data[i] = image.data[i] >= 128 ? 255 : 0;
        }

        mask.putImageData(image, 0, 0);
        ctx.globalAlpha = opacity * alpha * ink.alpha;
        ctx.drawImage(scratch, 0, 0);
        ctx.globalAlpha = 1;
      };

      stamp(style.fill, Number(style.fillOpacity), false);
      stamp(style.stroke, Number(style.strokeOpacity), true);
      count += 1;
    };

    for (const element of svg.querySelectorAll<SVGGraphicsElement>(selector)) {
      rasterizeElement(element);
    }

    setReady(count > 0);
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- SVG mutation and geometry revisions are existing native repaint signals; retain them even when canvas bounds stay equal.
  }, [paint, revision, scale, width, height, x, y, background]);

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      pointerEvents="none"
    >
      <div className="mc-chart-pixel-background" style={backgroundStyle}>
        <canvas
          ref={canvas}
          aria-hidden="true"
          data-mc-ready={ready}
          className="mc-chart-pixel-canvas"
          style={canvasStyle}
        />
      </div>
    </foreignObject>
  );
};
