"use client";
import * as React from "react";
import { MinecraftText } from "./minecraft-text";
import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { minecraftGlyphs } from "./minecraft-font";
import "./minecraft-chart.css";
const f = Math.fround;
const widthOf = (value: string) =>
  Array.from(value).reduce(
    (n, c) => n + (minecraftGlyphs[c.charCodeAt(0) - 32]?.[2] ?? 6),
    0,
  );
const cssColor = (value: number) =>
  `#${(value & 0xffffff).toString(16).padStart(6, "0")}`;
function NativeChartText({
  text,
  x,
  y,
  color = 0xffffff,
  shadow = true,
  scale,
}: {
  text: string;
  x: number;
  y: number;
  color?: number;
  shadow?: boolean;
  scale: 1 | 2 | 3;
}) {
  const ink = cssColor(color),
    shade = shadow
      ? cssColor(
          ((((color >> 16) & 255) >> 2) << 16) |
            ((((color >> 8) & 255) >> 2) << 8) |
            ((color & 255) >> 2),
        )
      : "transparent";
  return (
    <span
      className="mc-chart-text"
      style={
        {
          left: x * scale,
          top: y * scale,
          "--mc-ink": ink,
          "--mc-shadow": shade,
          color: ink,
        } as React.CSSProperties
      }
    >
      {/[^\x00-\x7f]/.test(text) ? (
        <MinecraftColorUnicodeLabel text={text} />
      ) : (
        <MinecraftText>{text}</MinecraftText>
      )}
    </span>
  );
}
function FpsBarColor(nanos: number) {
  const ms = Math.max(0, Math.min(56, nanos / 1e6)),
    t = f(ms < 28 ? ms / 28 : (ms - 28) / 28),
    a = ms < 28 ? [0, 255, 0] : [255, 255, 0],
    b = ms < 28 ? [255, 255, 0] : [255, 0, 0];
  return `rgb(${a.map((v, i) => v + Math.floor(f(t * (b[i] - v)))).join(",")})`;
}
type MinecraftFpsChartProps = React.ComponentProps<"div"> & {
  samples: readonly number[];
  width?: number;
  framerateLimit?: number;
  scale?: 1 | 2 | 3;
};
type NativeBarPresentation = {
  visible: readonly number[];
  labels: readonly string[];
  guides: readonly { label: string; nanos: number }[];
};
function MinecraftFpsChart(props: MinecraftFpsChartProps) {
  return <NativeFpsPlot {...props} />;
}
function NativeFpsPlot({
  presentation,
  samples,
  width = 242,
  framerateLimit = 260,
  scale = 2,
  style,
  ...props
}: MinecraftFpsChartProps & { presentation?: NativeBarPresentation }) {
  if (!Number.isInteger(width) || width < 3 || width > 242)
    throw new Error("Native FPS width must be an integer from3to242");
  const retained = samples.slice(-240);
  if (retained.some((v) => !Number.isFinite(v) || v < 0))
    throw new Error("Frame samples must be finite nonnegative nanoseconds");
  const visible = presentation?.visible ?? retained.slice(Math.max(0, 240 - (width - 2))),
    ms = (n: number) => `${Math.floor(n / 1e6 + 0.5)} ms`,
    labels = presentation?.labels ?? (visible.length
      ? [
          `${ms(Math.min(...visible))} min`,
          `${ms(visible.reduce((a, b) => a + b, 0) / visible.length)} avg`,
          `${ms(Math.max(...visible))} max`,
        ]
      : []),
    line = (y: number, color: string, key: string) => (
      <span
        key={key}
        className="mc-chart-rect"
        style={{
          left: 0,
          top: y * scale,
          width: width * scale,
          height: scale,
          background: color,
        }}
      />
    ),
    shade = (text: string, y: number) => (
      <React.Fragment key={text}>
        <span
          className="mc-chart-rect"
          style={{
            left: scale,
            top: y * scale,
            width: (widthOf(text) + 1) * scale,
            height: 9 * scale,
            background: "rgba(80,80,80,0.5647058823529412)",
          }}
        />
        {visible.map((sample, i) => {
          const h = Math.floor(((sample / 1e6) * 60) / (1000 / 30) + 0.5),
            top = Math.max(y, 69 - h),
            bottom = Math.min(y + 9, 69);
          if (i + 1 >= widthOf(text) + 2 || bottom <= top) return null;
          const rgb = FpsBarColor(sample).match(/\d+/g)!.map(Number),
            mixed = rgb.map((v) =>
              Math.round((80 * 144) / 255 + (v * 111) / 255),
            );
          return (
            <span
              key={i}
              className="mc-chart-rect"
              style={{
                left: (i + 1) * scale,
                top: top * scale,
                width: scale,
                height: (bottom - top) * scale,
                background: `rgb(${mixed.join(",")})`,
              }}
            />
          );
        })}
        <NativeChartText
          text={text}
          x={2}
          y={y + 1}
          color={0xe0e0e0}
          shadow={false}
          scale={scale}
        />
      </React.Fragment>
    );
  return (
    <div
      role="img"
      aria-label="Frame-time chart"
      data-slot="minecraft-fps-chart"
      style={
        {
          position: "relative",
          width: width * scale,
          height: 69 * scale,
          "--mc-scale": scale,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <span
        className="mc-chart-rect"
        style={{
          left: 0,
          top: 9 * scale,
          width: width * scale,
          height: 60 * scale,
          background: "rgba(80,80,80,0.5647058823529412)",
        }}
      />
      {visible.map((sample, i) => {
        const h = Math.floor(((sample / 1e6) * 60) / (1000 / 30) + 0.5);
        return (
          <span
            key={i}
            className="mc-chart-rect"
            style={{
              left: (i + 1) * scale,
              top: (69 - h) * scale,
              width: scale,
              height: h * scale,
              background: FpsBarColor(sample),
            }}
          />
        );
      })}
      {line(9, "white", "top")}
      {line(68, "white", "bottom")}
      <span
        className="mc-chart-rect"
        style={{
          left: 0,
          top: 10 * scale,
          width: scale,
          height: 59 * scale,
          background: "white",
        }}
      />
      <span
        className="mc-chart-rect"
        style={{
          left: (width - 1) * scale,
          top: 10 * scale,
          width: scale,
          height: 59 * scale,
          background: "white",
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
          color={0xe0e0e0}
          scale={scale}
        />
      ))}
      {presentation ? presentation.guides.map((guide, index) => {
        const h = Math.floor(((guide.nanos / 1e6) * 60) / (1000 / 30) + 0.5);
        const y = Math.max(9, Math.min(68, 69 - h));
        return <React.Fragment key={index}>{line(y,"white",`guide-${index}`)}{shade(guide.label,Math.min(59,y+1))}</React.Fragment>;
      }) : <>{shade("30 FPS", 10)}{shade("60 FPS", 40)}{line(39, "white", "sixty")}</>}
      {framerateLimit > 0 && framerateLimit <= 250
        ? line(
            68 -
              Math.floor(
                ((1e9 / framerateLimit / 1e6) * 60) / (1000 / 30) + 0.5,
              ),
            "#00ffff",
            "cap",
          )
        : null}
    </div>
  );
}
export type MinecraftMetricChartProps = Omit<MinecraftFpsChartProps,"samples"|"framerateLimit"> & {
  samples: readonly number[];
  domain: readonly [number,number];
  unit?: string;
  formatValue?: (value:number) => string;
  guides?: readonly {value:number;label?:string}[];
};
/** Native F3 bar appearance with explicit web-metric normalization and captions. */
function MinecraftMetricChart({samples,domain,unit="",formatValue,guides,width=242,...props}:MinecraftMetricChartProps) {
  const [minimum,maximum]=domain,span=maximum-minimum;
  if(!Number.isFinite(minimum)||!Number.isFinite(maximum)||span<=0)throw new Error("Metric domain must be finite and increasing");
  if(samples.some(value=>!Number.isFinite(value)))throw new Error("Metric samples must be finite");
  if(guides?.some(guide=>!Number.isFinite(guide.value)||guide.value<minimum||guide.value>maximum))throw new Error("Metric guides must be inside the domain");
  const visible=samples.slice(-Math.min(240,width-2));
  const normalize=(value:number)=>Math.max(0,Math.min(1,(value-minimum)/span))*(1000/30)*1e6;
  const format=(value:number)=>formatValue?.(value)??`${Math.round(value)}${unit?` ${unit}`:""}`;
  const presentation:NativeBarPresentation={
    visible:visible.map(normalize),
    labels:visible.length?[`${format(Math.min(...visible))} min`,`${format(visible.reduce((sum,value)=>sum+value,0)/visible.length)} avg`,`${format(Math.max(...visible))} max`]:[],
    guides:(guides??[{value:maximum},{value:minimum+span/2}]).map(guide=>({label:guide.label??format(guide.value),nanos:normalize(guide.value)})),
  };
  return <NativeFpsPlot aria-label="Metric chart" data-slot="minecraft-metric-chart" data-mc-domain={`${minimum},${maximum}`} {...props} width={width} samples={presentation.visible} framerateLimit={260} presentation={presentation}/>;
}
export { MinecraftMetricChart };

type MinecraftProfilerDatum = {
  name: string;
  percentage: number;
  globalPercentage?: number;
  count?: number;
};
type MinecraftProfilerChartProps = React.ComponentProps<"div"> & {
  data: readonly MinecraftProfilerDatum[];
  rootName?: string;
  globalPercentage?: number;
  scale?: 1 | 2 | 3;
};
function profileColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (Math.imul(hash, 31) + name.charCodeAt(i)) | 0;
  return ((hash & 0xaaaaaa) + 0x444444) & 0xffffff;
}
const sin = new Float32Array(65536);
for (let i = 0; i < sin.length; i++)
  sin[i] = Math.sin((i * Math.PI * 2) / 65536);
const nativeSin = (angle: number) =>
    sin[Math.trunc(angle * 10430.378350470453) & 65535],
  nativeCos = (angle: number) =>
    sin[Math.trunc(angle * 10430.378350470453 + 16384) & 65535];
function paintProfiler(
  canvas: HTMLCanvasElement,
  data: readonly MinecraftProfilerDatum[],
  scale: number,
) {
  const surface = document.createElement("canvas");
  surface.width=260*scale;
  surface.height=114*scale;
  const gl = surface.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl || gl.isContextLost()) return false;
  try {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if(!s)return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))return null;
    return s;
  };
  const vs = shader(
      gl.VERTEX_SHADER,
      "#version 300 es\nin vec2 position;in vec3 color;out vec3 vColor;uniform vec2 extent;void main(){gl_Position=vec4(position*vec2(2.0,-2.0)/extent+vec2(-1.0,1.0),0.0,1.0);vColor=color;}",
    ),
    fs = shader(
      gl.FRAGMENT_SHADER,
      "#version 300 es\nprecision highp float;in vec3 vColor;out vec4 outColor;void main(){outColor=vec4(vColor,1.0);}",
    ),
    program = gl.createProgram()!;
  if(!program||!vs||!fs)return false;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;
  gl.useProgram(program);
  gl.viewport(0, 0, surface.width, surface.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  const tops: number[] = [],
    sides: number[] = [];
  let start = 0;
  for (const item of data) {
    const percentage = item.percentage,
      steps = Math.floor(percentage / 4) + 1,
      color = profileColor(item.name),
      rgb = [(color >> 16) & 255, (color >> 8) & 255, color & 255],
      dark = rgb.map((v) => Math.floor((v * 128) / 255));
    const point = (i: number) => {
      const a = f(
        ((start + (percentage * i) / steps) * 6.2831854820251465) / 100,
      );
      return [f(nativeSin(a) * 105), f(f(nativeCos(a) * 105) * 0.5)];
    };
    const vertex = (target: number[], p: number[], ink: number[]) =>
      target.push(
        f(f(p[0] * scale) + 130 * scale),
        f(f(p[1] * scale) + 52 * scale),
        ...ink.map((v) => v / 255),
      );
    const triangle = (
      target: number[],
      a: number[],
      b: number[],
      c: number[],
      ink: number[],
    ) => {
      vertex(target, a, ink);
      vertex(target, b, ink);
      vertex(target, c, ink);
    };
    for (let i = steps; i > 0; i--)
      triangle(tops, [0, 0], point(i), point(i - 1), rgb);
    for (let i = steps; i > 0; i--) {
      const a = point(i),
        b = point(i - 1);
      if (f(f(a[1] + b[1]) / 2) < 0) continue;
      const ab = [a[0], f(a[1] + 10)],
        bb = [b[0], f(b[1] + 10)];
      triangle(sides, a, ab, bb, dark);
      triangle(sides, a, bb, b, dark);
    }
    start += percentage;
  }
  const buffer = gl.createBuffer()!;
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
    surface.height,
  );
  gl.drawArrays(gl.TRIANGLES, 0, values.length / 5);
  gl.deleteBuffer(buffer);
  gl.deleteProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if(gl.isContextLost())return false;
  const context=canvas.getContext("2d");
  if(!context)return false;
  canvas.width=surface.width;canvas.height=surface.height;
  const pixels=new Uint8Array(surface.width*surface.height*4);
  gl.readPixels(0,0,surface.width,surface.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  if(gl.isContextLost())return false;
  const rgba=new Uint8ClampedArray(pixels.length),stride=surface.width*4;
  for(let y=0;y<surface.height;y++)rgba.set(pixels.subarray((surface.height-1-y)*stride,(surface.height-y)*stride),y*stride);
  context.putImageData(new ImageData(rgba,surface.width,surface.height),0,0);
  return true;
  } catch(error) {
    if(gl.isContextLost())return false;
    return false;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
function MinecraftProfilerChart({
  data,
  rootName = "root",
  globalPercentage = 100,
  scale = 2,
  style,
  ...props
}: MinecraftProfilerChartProps) {
  const canvas = React.useRef<HTMLCanvasElement>(null),
    [ready, setReady] = React.useState(false);
  React.useLayoutEffect(()=>{
    let disposed=false,frame=0;
    setReady(false);
    const render=()=>{
      if(disposed)return;
      if(paintProfiler(canvas.current!,data,scale))setReady(true);
      else frame=requestAnimationFrame(render);
    };
    render();
    return()=>{disposed=true;cancelAnimationFrame(frame)};
  },[data,scale]);
  if (data.some((d) => !Number.isFinite(d.percentage) || d.percentage < 0))
    throw new Error("Profiler percentages must be finite and nonnegative");
  const height = 139 + data.length * 9,
    percent = (v: number) => `${v.toFixed(2)}%`;
  return (
    <div
      role="img"
      aria-label="Profiler chart"
      data-slot="minecraft-profiler-chart"
      data-mc-ready={ready}
      style={
        {
          position: "relative",
          width: 270 * scale,
          height: height * scale,
          background: "rgba(80,80,80,0.5647058823529412)",
          "--mc-scale": scale,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <canvas
        key="profiler-2d-surface"
        ref={canvas}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 5 * scale,
          top: 15 * scale,
          width: 260 * scale,
          height: 114 * scale,
          imageRendering: "pixelated",
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
        const local = percent(item.percentage),
          global = percent(item.globalPercentage ?? item.percentage),
          y = 134 + i * 9,
          color = profileColor(item.name);
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
  );
}
export { MinecraftFpsChart, MinecraftProfilerChart };
export type {
  MinecraftFpsChartProps,
  MinecraftProfilerChartProps,
  MinecraftProfilerDatum,
};
