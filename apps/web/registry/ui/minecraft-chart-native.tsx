"use client";

import * as React from "react";
import { useChartWidth, useChartHeight, useYAxisScale } from "recharts";

import {
  useChartGeometry,
  chartColorChannels,
} from "./minecraft-chart-context";
import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { minecraftGlyphs } from "./minecraft-font";
import { MinecraftText } from "./minecraft-text";

import "./minecraft-chart.css";

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

interface NativeChartTextStyle extends React.CSSProperties {
  "--mc-ink": string;
  "--mc-shadow": string;
}

const f = Math.fround;

const widthOf = (value: string) =>
  [...value].reduce((n, c) => {
    const codePoint = c.codePointAt(0);

    if (codePoint === undefined) {
      throw new Error("Expected a non-empty chart glyph character");
    }

    return n + (asciiGlyphs[codePoint - 32]?.[2] ?? 6);
  }, 0);

const cssColor = (value: number) =>
  // oxlint-disable-next-line no-bitwise -- CSS receives only the low 24 RGB bits of the native packed color.
  `#${(value & 0xff_ff_ff).toString(16).padStart(6, "0")}`;

const NativeChartText = ({
  text,
  x,
  y,
  color = 0xff_ff_ff,
  shadow = true,
  scale,
}: {
  text: string;
  x: number;
  y: number;
  color?: number;
  shadow?: boolean;
  scale: 1 | 2 | 3;
}) => {
  const ink = cssColor(color);

  const shade = shadow
    ? cssColor(
        /* oxlint-disable no-bitwise -- Quarter the packed RGB bytes and reassemble the native chart text shadow color. */
        ((((color >> 16) & 255) >> 2) << 16) |
          ((((color >> 8) & 255) >> 2) << 8) |
          ((color & 255) >> 2)
        /* oxlint-enable no-bitwise */
      )
    : "transparent";

  const textStyle: NativeChartTextStyle = {
    "--mc-ink": ink,
    "--mc-shadow": shade,
    color: ink,
    left: x * scale,
    top: y * scale,
  };

  return (
    <span className="mc-chart-text" style={textStyle}>
      {/\P{ASCII}/u.test(text) ? (
        <MinecraftColorUnicodeLabel text={text} />
      ) : (
        <MinecraftText>{text}</MinecraftText>
      )}
    </span>
  );
};

/** Minecraft's frame-duration gradient; input is in nanoseconds. */
export const chartFpsColor = function chartFpsColor(nanos: number) {
  const ms = Math.max(0, Math.min(56, nanos / 1e6));
  const t = f(ms < 28 ? ms / 28 : (ms - 28) / 28);
  const a = ms < 28 ? [0, 255, 0] : [255, 255, 0];
  const b = ms < 28 ? [255, 255, 0] : [255, 0, 0];

  return `rgb(${a.map((v, i) => v + Math.floor(f(t * (b[i] - v)))).join(",")})`;
};

/** Decoration inside a Recharts BarChart. The bar shape supplies engine geometry. */
const ChartFpsFrame = ({
  labels = [],
  guides,
  framerateLimit = 260,
}: {
  labels?: readonly string[];
  guides?: readonly { label: string; value: number }[];
  framerateLimit?: number;
}) => {
  const { entries, scale } = useChartGeometry();

  const chartWidth = useChartWidth() ?? 0;
  const chartHeight = useChartHeight() ?? 0;

  const width = chartWidth / scale;
  const bars = entries.filter((item) => item.kind === "bar");
  const host = React.useRef<HTMLDivElement>(null);
  const yScale = useYAxisScale();
  const presentation = guides ? { guides } : undefined;

  const line = (y: number, color: string, key: string) => (
    <span
      key={key}
      className="mc-chart-rect mc-layout-minecraft-chart-native-1"
      style={{
        background: color,
        height: scale,

        top: y * scale,
        width: width * scale,
      }}
    />
  );

  const shade = (text: string, y: number) => (
    <React.Fragment key={text}>
      <span
        className="mc-chart-rect mc-layout-minecraft-chart-native-2"
        style={{
          height: 9 * scale,
          left: scale,
          top: y * scale,
          width: (widthOf(text) + 1) * scale,
        }}
      />
      {bars.map((bar, i) => {
        const h = Math.round(bar.height / scale);
        const baseline = Math.round((bar.y + bar.height) / scale);
        const top = Math.max(y, baseline - h);
        const bottom = Math.min(y + 9, baseline);
        const left = Math.round(bar.x / scale);

        const labelOverlapWidth = Math.min(
          Math.round(bar.width / scale),
          widthOf(text) + 2 - left
        );

        if (labelOverlapWidth <= 0 || bottom <= top) {
          return null;
        }

        const rgb = chartColorChannels(bar.fill, host.current);

        const mixed = rgb.map((v) =>
          Math.round((80 * 144) / 255 + (v * 111) / 255)
        );

        return (
          <span
            key={i}
            className="mc-chart-rect"
            style={{
              background: `rgb(${mixed.join(",")})`,
              height: (bottom - top) * scale,
              left: left * scale,
              top: top * scale,
              width: labelOverlapWidth * scale,
            }}
          />
        );
      })}
      <NativeChartText
        text={text}
        x={2}
        y={y + 1}
        color={0xe0_e0_e0}
        shadow={false}
        scale={scale}
      />
    </React.Fragment>
  );

  return (
    <foreignObject
      x={0}
      y={0}
      width={chartWidth}
      height={chartHeight}
      className="mc-layout-minecraft-chart-native-4"
    >
      <div
        ref={host}
        data-slot="chart-fps-frame"
        data-mc-ready={bars.length > 0}
        className="mc-layout-minecraft-chart-native-5"
        style={{ height: chartHeight, width: chartWidth }}
      >
        <span
          className="mc-chart-rect mc-layout-minecraft-chart-native-6"
          style={{
            height: 60 * scale,

            top: 9 * scale,
            width: width * scale,
          }}
        />
        {bars.map((bar, i) => {
          const h = Math.round(bar.height / scale);

          return (
            <span
              key={i}
              className="mc-chart-rect"
              style={{
                background: bar.fill,
                height: h * scale,
                left: Math.round(bar.x / scale) * scale,
                top: (Math.round((bar.y + bar.height) / scale) - h) * scale,
                width: Math.round(bar.width / scale) * scale,
              }}
            />
          );
        })}
        {line(9, "white", "top")}
        {line(68, "white", "bottom")}
        <span
          className="mc-chart-rect mc-layout-minecraft-chart-native-8"
          style={{
            height: 59 * scale,

            top: 10 * scale,
            width: scale,
          }}
        />
        <span
          className="mc-chart-rect mc-layout-minecraft-chart-native-9"
          style={{
            height: 59 * scale,
            left: (width - 1) * scale,
            top: 10 * scale,
            width: scale,
          }}
        />
        {labels.map((text, i) => (
          <NativeChartText
            key={i}
            text={text}
            x={
              i === 0
                ? 2
                : i === 1
                  ? Math.floor(width / 2) - Math.floor(widthOf(text) / 2)
                  : width - widthOf(text) - 2
            }
            y={0}
            color={0xe0_e0_e0}
            scale={scale}
          />
        ))}
        {presentation ? (
          presentation.guides.map((guide, index) => {
            const y = Math.max(
              9,
              Math.min(
                68,
                Math.round((yScale?.(guide.value) ?? 9 * scale) / scale)
              )
            );

            return (
              <React.Fragment key={index}>
                {line(y, "white", `guide-${index}`)}
                {shade(guide.label, Math.min(59, y + 1))}
              </React.Fragment>
            );
          })
        ) : (
          <>
            {shade("30 FPS", 10)}
            {shade("60 FPS", 40)}
            {line(39, "white", "sixty")}
          </>
        )}
        {framerateLimit > 0 && framerateLimit <= 250
          ? line(
              68 -
                Math.floor(
                  ((1e9 / framerateLimit / 1e6) * 60) / (1000 / 30) + 0.5
                ),
              "#00ffff",
              "cap"
            )
          : null}
      </div>
    </foreignObject>
  );
};

export const chartProfilerColor = function chartProfilerColor(name: string) {
  let hash = 0;

  for (let i = 0; i < name.length; i += 1) {
    // oxlint-disable-next-line unicorn/prefer-code-point -- The native profiler hashes successive UTF-16 code units; code points change astral-name colors.
    hash = Math.trunc(Math.imul(hash, 31) + name.charCodeAt(i));
  }

  // oxlint-disable-next-line no-bitwise -- The native profiler derives its packed RGB color with these exact hash masks.
  return cssColor(((hash & 0xaa_aa_aa) + 0x44_44_44) & 0xff_ff_ff);
};

const sin = new Float32Array(65_536);

for (let i = 0; i < sin.length; i += 1) {
  sin[i] = Math.sin((i * Math.PI * 2) / 65_536);
}

const nativeSin = (angle: number) =>
  // oxlint-disable-next-line no-bitwise -- Native trigonometry table addresses wrap to their low 16 bits.
  sin[Math.trunc(angle * 10_430.378350470453) & 65_535];

const nativeCos = (angle: number) =>
  // oxlint-disable-next-line no-bitwise -- Native trigonometry table addresses wrap to their low 16 bits after the cosine offset.
  sin[Math.trunc(angle * 10_430.378350470453 + 16_384) & 65_535];

const paintProfiler = function paintProfiler(
  canvas: HTMLCanvasElement,
  data: readonly {
    name: string;
    percentage: number;
    sweep: number;
    start: number;
    fill: string;
  }[],
  scale: number
) {
  const surface = document.createElement("canvas");
  surface.width = 260 * scale;
  surface.height = 114 * scale;

  const gl = surface.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl || gl.isContextLost()) {
    return false;
  }

  try {
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type);

      if (!s) {
        return null;
      }

      gl.shaderSource(s, source);
      gl.compileShader(s);

      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        return null;
      }

      return s;
    };

    const vs = shader(
      gl.VERTEX_SHADER,
      "#version 300 es\nin vec2 position;in vec3 color;out vec3 vColor;uniform vec2 extent;void main(){gl_Position=vec4(position*vec2(2.0,-2.0)/extent+vec2(-1.0,1.0),0.0,1.0);vColor=color;}"
    );

    const fs = shader(
      gl.FRAGMENT_SHADER,
      "#version 300 es\nprecision highp float;in vec3 vColor;out vec4 outColor;void main(){outColor=vec4(vColor,1.0);}"
    );

    const program = gl.createProgram();

    if (!program || !vs || !fs) {
      return false;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return false;
    }

    gl.useProgram(program);
    gl.viewport(0, 0, surface.width, surface.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    const tops: number[] = [];
    const sides: number[] = [];

    for (const item of data) {
      const { start } = item;
      const percentage = item.sweep;
      const steps = Math.floor(Math.abs(percentage) / 4) + 1;
      const rgb = chartColorChannels(item.fill, canvas);
      const dark = rgb.map((v) => Math.floor((v * 128) / 255));

      const point = (i: number) => {
        const a = f(
          ((start + (percentage * i) / steps) * 6.2831854820251465) / 100
        );

        return [f(nativeSin(a) * 105), f(f(nativeCos(a) * 105) * 0.5)];
      };

      const vertex = (target: number[], p: number[], ink: number[]) =>
        target.push(
          f(f(p[0] * scale) + 130 * scale),
          f(f(p[1] * scale) + 52 * scale),
          ...ink.map((v) => v / 255)
        );

      const triangle = (
        target: number[],
        a: number[],
        b: number[],
        c: number[],
        ink: number[]
      ) => {
        vertex(target, a, ink);
        vertex(target, b, ink);
        vertex(target, c, ink);
      };

      for (let i = steps; i > 0; i -= 1) {
        triangle(tops, [0, 0], point(i), point(i - 1), rgb);
      }

      for (let i = steps; i > 0; i -= 1) {
        const a = point(i);
        const b = point(i - 1);

        if (f(f(a[1] + b[1]) / 2) < 0) {
          continue;
        }

        const ab = [a[0], f(a[1] + 10)];
        const bb = [b[0], f(b[1] + 10)];

        triangle(sides, a, ab, bb, dark);
        triangle(sides, a, bb, b, dark);
      }
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const values = new Float32Array([...tops, ...sides]);
    gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);

    for (const [name, size, offset] of [
      ["position", 2, 0],
      ["color", 3, 8],
    ] as const) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 20, offset);
    }

    gl.uniform2f(
      gl.getUniformLocation(program, "extent"),
      surface.width,
      surface.height
    );
    gl.drawArrays(gl.TRIANGLES, 0, values.length / 5);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (gl.isContextLost()) {
      return false;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return false;
    }

    canvas.width = surface.width;
    canvas.height = surface.height;
    const pixels = new Uint8Array(surface.width * surface.height * 4);
    gl.readPixels(
      0,
      0,
      surface.width,
      surface.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    if (gl.isContextLost()) {
      return false;
    }

    const rgba = new Uint8ClampedArray(pixels.length);
    const stride = surface.width * 4;

    for (let y = 0; y < surface.height; y += 1) {
      rgba.set(
        pixels.subarray(
          (surface.height - 1 - y) * stride,
          (surface.height - y) * stride
        ),
        y * stride
      );
    }

    context.putImageData(
      new ImageData(rgba, surface.width, surface.height),
      0,
      0
    );

    return true;
  } catch {
    if (gl.isContextLost()) {
      return false;
    }

    return false;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
};

/** Header, legend and batched pixel surface for Recharts Pie shapes. */
const ChartProfilerFrame = ({
  rootName = "root",
  globalPercentage = 100,
}: {
  rootName?: string;
  globalPercentage?: number;
}) => {
  const { entries, scale, revision } = useChartGeometry();
  const sectors = entries.filter((item) => item.kind === "sector");
  const key = JSON.stringify(sectors);

  const data = React.useMemo(
    () =>
      sectors.map((item) => ({
        fill: item.fill,
        globalPercentage: item.globalPercentage,
        name: item.name,
        percentage: item.percent * 100,
        start: ((item.startAngle + 90) / 360) * 100,
        sweep: ((item.endAngle - item.startAngle) / 360) * 100,
      })),
    [key]
  );

  const unit = sectors.at(0) ? sectors[0].outerRadius / 105 : scale;

  const width = useChartWidth() ?? 0;
  const height = useChartHeight() ?? 0;

  const canvas = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!data.length) {
      return;
    }

    let disposed = false;
    let frame = 0;

    setReady(false);

    const render = () => {
      if (disposed) {
        return;
      }

      if (canvas.current && paintProfiler(canvas.current, data, unit)) {
        setReady(true);
      } else {
        frame = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [data, unit, revision]);

  if (data.some((d) => !Number.isFinite(d.percentage) || d.percentage < 0)) {
    throw new Error("Profiler percentages must be finite and nonnegative");
  }

  const percent = (v: number) => `${v.toFixed(2)}%`;

  if (!sectors.length) {
    return null;
  }

  const sector = sectors[0];

  return (
    <foreignObject
      x={0}
      y={0}
      width={width}
      height={height}
      className="mc-layout-minecraft-chart-native-10"
    >
      <div
        data-slot="chart-profiler-frame"
        data-mc-ready={ready}
        className="mc-layout-minecraft-chart-native-11"
        style={{ height, width }}
      >
        <canvas
          key="profiler-2d-surface"
          ref={canvas}
          aria-hidden="true"
          className="mc-layout-minecraft-chart-native-12"
          style={{
            height: 114 * unit,

            left: sector.cx - 130 * unit,

            top: sector.cy - 52 * unit,
            width: 260 * unit,
          }}
        />
        <NativeChartText text={rootName} x={5} y={5} scale={scale} />
        <NativeChartText
          text={percent(globalPercentage)}
          x={265 - widthOf(percent(globalPercentage))}
          y={5}
          scale={scale}
        />
        {data.map((item, i) => {
          const rgb = chartColorChannels(item.fill, canvas.current);
          // oxlint-disable-next-line no-bitwise -- Pack the resolved chart RGB bytes into the native color word.
          const color = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];

          const local = percent(item.percentage);
          const global = percent(item.globalPercentage ?? item.percentage);
          const y = 134 + i * 9;

          return (
            <React.Fragment key={i}>
              <NativeChartText
                text={`${item.name === "unspecified" ? "[?]" : `[${i + 1}]`} ${item.name}`}
                x={5}
                y={y}
                color={color}
                scale={scale}
              />
              <NativeChartText
                text={local}
                x={215 - widthOf(local)}
                y={y}
                color={color}
                scale={scale}
              />
              <NativeChartText
                text={global}
                x={265 - widthOf(global)}
                y={y}
                color={color}
                scale={scale}
              />
            </React.Fragment>
          );
        })}
      </div>
    </foreignObject>
  );
};

export { ChartFpsFrame, ChartProfilerFrame };
