"use client";
import { useChartWidth, useChartHeight, useYAxisScale } from "recharts";
import { useChartGeometry, chartColorChannels } from "./minecraft-chart-context";
import * as React from "react";
import { MinecraftText } from "./minecraft-text";
import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { minecraftGlyphs } from "./minecraft-font";
import "./minecraft-chart.css";
const f = Math.fround;
const widthOf = (value: string) => Array.from(value).reduce((n, c) => n + (minecraftGlyphs[c.charCodeAt(0) - 32]?.[2] ?? 6), 0);
const cssColor = (value: number) => `#${(value & 0xffffff).toString(16).padStart(6, "0")}`;
function NativeChartText({ text, x, y, color = 0xffffff, shadow = true, scale, }: {
    text: string;
    x: number;
    y: number;
    color?: number;
    shadow?: boolean;
    scale: 1 | 2 | 3;
}) {
    const ink = cssColor(color), shade = shadow
        ? cssColor(((((color >> 16) & 255) >> 2) << 16) |
            ((((color >> 8) & 255) >> 2) << 8) |
            ((color & 255) >> 2))
        : "transparent";
    return (<span className="mc-chart-text" style={{
            left: x * scale,
            top: y * scale,
            "--mc-ink": ink,
            "--mc-shadow": shade,
            color: ink,
        } as React.CSSProperties}>
      {/[^\x00-\x7f]/.test(text) ? (<MinecraftColorUnicodeLabel text={text}/>) : (<MinecraftText>{text}</MinecraftText>)}
    </span>);
}
/** Minecraft's frame-duration gradient; input is in nanoseconds. */
export function chartFpsColor(nanos: number) {
    const ms = Math.max(0, Math.min(56, nanos / 1e6)), t = f(ms < 28 ? ms / 28 : (ms - 28) / 28), a = ms < 28 ? [0, 255, 0] : [255, 255, 0], b = ms < 28 ? [255, 255, 0] : [255, 0, 0];
    return `rgb(${a.map((v, i) => v + Math.floor(f(t * (b[i] - v)))).join(",")})`;
}
/** Decoration inside a Recharts BarChart. The bar shape supplies engine geometry. */
function ChartFpsFrame({ labels = [], guides, framerateLimit = 260 }: {
    labels?: readonly string[];
    guides?: readonly { label: string; value: number }[];
    framerateLimit?: number;
}) {
    const {entries,scale} = useChartGeometry();
    const chartWidth = useChartWidth() ?? 0, chartHeight = useChartHeight() ?? 0;
    const width = chartWidth / scale;
    const bars = entries.filter(item => item.kind === "bar");
    const host = React.useRef<HTMLDivElement>(null);
    const yScale = useYAxisScale();
    const presentation = guides ? {guides} : undefined;
    const line = (y: number, color: string, key: string) => (<span key={key} className="mc-chart-rect" style={{left:0, top:y*scale,width:width*scale,height:scale,background:color}}/>), shade = (text: string, y: number) => (<React.Fragment key={text}>
        <span className="mc-chart-rect" style={{left:scale,top:y*scale,width:(widthOf(text)+1)*scale,height:9*scale,background:"rgba(80,80,80,0.5647058823529412)"}}/>
        {bars.map((bar, i) => {
            const h = Math.round(bar.height/scale), baseline=Math.round((bar.y+bar.height)/scale), top = Math.max(y,baseline-h), bottom = Math.min(y+9,baseline), left=Math.round(bar.x/scale), width=Math.min(Math.round(bar.width/scale),widthOf(text)+2-left);
            if (width<=0 || bottom<=top) return null;
            const rgb = chartColorChannels(bar.fill, host.current), mixed = rgb.map(v=>Math.round((80*144)/255+(v*111)/255));
            return <span key={i} className="mc-chart-rect" style={{left:left*scale,top:top*scale,width:width*scale,height:(bottom-top)*scale,background:`rgb(${mixed.join(",")})`}}/>;
        })}
        <NativeChartText text={text} x={2} y={y+1} color={0xe0e0e0} shadow={false} scale={scale}/>
      </React.Fragment>);
    return <foreignObject x={0} y={0} width={chartWidth} height={chartHeight} style={{pointerEvents:"none",overflow:"visible"}}><div ref={host} data-slot="chart-fps-frame" data-mc-ready={bars.length>0} style={{position:"relative",width:chartWidth,height:chartHeight}}>
      <span className="mc-chart-rect" style={{
            left: 0,
            top: 9 * scale,
            width: width * scale,
            height: 60 * scale,
            background: "rgba(80,80,80,0.5647058823529412)",
        }}/>
      {bars.map((bar, i) => {
            const h = Math.round(bar.height / scale);
            return <span key={i} className="mc-chart-rect" style={{left: Math.round(bar.x / scale)*scale, top:(Math.round((bar.y+bar.height)/scale)-h)*scale,width:Math.round(bar.width/scale)*scale,height:h*scale,background:bar.fill}}/>;
        })}
      {line(9, "white", "top")}
      {line(68, "white", "bottom")}
      <span className="mc-chart-rect" style={{
            left: 0,
            top: 10 * scale,
            width: scale,
            height: 59 * scale,
            background: "white",
        }}/>
      <span className="mc-chart-rect" style={{
            left: (width - 1) * scale,
            top: 10 * scale,
            width: scale,
            height: 59 * scale,
            background: "white",
        }}/>
      {labels.map((text, i) => (<NativeChartText key={i} text={text} x={i === 0
                ? 2
                : i === 1
                    ? Math.floor(width / 2) - Math.floor(widthOf(text) / 2)
                    : width - widthOf(text) - 2} y={0} color={0xe0e0e0} scale={scale}/>))}
      {presentation ? presentation.guides.map((guide, index) => {
            const y = Math.max(9,Math.min(68,Math.round(Number(yScale?.(guide.value) ?? 9 * scale) / scale)));
            return <React.Fragment key={index}>{line(y, "white", `guide-${index}`)}{shade(guide.label, Math.min(59, y + 1))}</React.Fragment>;
        }) : <>{shade("30 FPS", 10)}{shade("60 FPS", 40)}{line(39, "white", "sixty")}</>}
      {framerateLimit > 0 && framerateLimit <= 250
            ? line(68 -
                Math.floor(((1e9 / framerateLimit / 1e6) * 60) / (1000 / 30) + 0.5), "#00ffff", "cap")
            : null}
    </div></foreignObject>;
}
export function chartProfilerColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++)
        hash = (Math.imul(hash, 31) + name.charCodeAt(i)) | 0;
    return cssColor(((hash & 0xaaaaaa) + 0x444444) & 0xffffff);
}
const sin = new Float32Array(65536);
for (let i = 0; i < sin.length; i++)
    sin[i] = Math.sin((i * Math.PI * 2) / 65536);
const nativeSin = (angle: number) => sin[Math.trunc(angle * 10430.378350470453) & 65535], nativeCos = (angle: number) => sin[Math.trunc(angle * 10430.378350470453 + 16384) & 65535];
function paintProfiler(canvas: HTMLCanvasElement, data: readonly { name:string; percentage:number; sweep:number; start:number; fill:string }[], scale: number) {
    const surface = document.createElement("canvas");
    surface.width = 260 * scale;
    surface.height = 114 * scale;
    const gl = surface.getContext("webgl2", {
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
    });
    if (!gl || gl.isContextLost())
        return false;
    try {
        const shader = (type: number, source: string) => {
            const s = gl.createShader(type);
            if (!s)
                return null;
            gl.shaderSource(s, source);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                return null;
            return s;
        };
        const vs = shader(gl.VERTEX_SHADER, "#version 300 es\nin vec2 position;in vec3 color;out vec3 vColor;uniform vec2 extent;void main(){gl_Position=vec4(position*vec2(2.0,-2.0)/extent+vec2(-1.0,1.0),0.0,1.0);vColor=color;}"), fs = shader(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float;in vec3 vColor;out vec4 outColor;void main(){outColor=vec4(vColor,1.0);}"), program = gl.createProgram()!;
        if (!program || !vs || !fs)
            return false;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            return false;
        gl.useProgram(program);
        gl.viewport(0, 0, surface.width, surface.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        const tops: number[] = [], sides: number[] = [];

        for (const item of data) {
            const start = item.start, percentage = item.sweep, steps = Math.floor(Math.abs(percentage) / 4) + 1, rgb = chartColorChannels(item.fill, canvas), dark = rgb.map((v) => Math.floor((v * 128) / 255));
            const point = (i: number) => {
                const a = f(((start + (percentage * i) / steps) * 6.2831854820251465) / 100);
                return [f(nativeSin(a) * 105), f(f(nativeCos(a) * 105) * 0.5)];
            };
            const vertex = (target: number[], p: number[], ink: number[]) => target.push(f(f(p[0] * scale) + 130 * scale), f(f(p[1] * scale) + 52 * scale), ...ink.map((v) => v / 255));
            const triangle = (target: number[], a: number[], b: number[], c: number[], ink: number[]) => {
                vertex(target, a, ink);
                vertex(target, b, ink);
                vertex(target, c, ink);
            };
            for (let i = steps; i > 0; i--)
                triangle(tops, [0, 0], point(i), point(i - 1), rgb);
            for (let i = steps; i > 0; i--) {
                const a = point(i), b = point(i - 1);
                if (f(f(a[1] + b[1]) / 2) < 0)
                    continue;
                const ab = [a[0], f(a[1] + 10)], bb = [b[0], f(b[1] + 10)];
                triangle(sides, a, ab, bb, dark);
                triangle(sides, a, bb, b, dark);
            }

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
        gl.uniform2f(gl.getUniformLocation(program, "extent"), surface.width, surface.height);
        gl.drawArrays(gl.TRIANGLES, 0, values.length / 5);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (gl.isContextLost())
            return false;
        const context = canvas.getContext("2d");
        if (!context)
            return false;
        canvas.width = surface.width;
        canvas.height = surface.height;
        const pixels = new Uint8Array(surface.width * surface.height * 4);
        gl.readPixels(0, 0, surface.width, surface.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (gl.isContextLost())
            return false;
        const rgba = new Uint8ClampedArray(pixels.length), stride = surface.width * 4;
        for (let y = 0; y < surface.height; y++)
            rgba.set(pixels.subarray((surface.height - 1 - y) * stride, (surface.height - y) * stride), y * stride);
        context.putImageData(new ImageData(rgba, surface.width, surface.height), 0, 0);
        return true;
    }
    catch (error) {
        if (gl.isContextLost())
            return false;
        return false;
    }
    finally {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
}
/** Header, legend and batched pixel surface for Recharts Pie shapes. */
function ChartProfilerFrame({rootName="root",globalPercentage=100}: {rootName?:string;globalPercentage?:number}) {
    const {entries,scale,revision}=useChartGeometry();
    const sectors=entries.filter(item=>item.kind==="sector");
    const key=JSON.stringify(sectors);
    const data=React.useMemo(()=>sectors.map(item=>({name:item.name,percentage:item.percent*100,sweep:(item.endAngle-item.startAngle)/360*100,start:(item.startAngle+90)/360*100,globalPercentage:item.globalPercentage,fill:item.fill})),[key]);
    const unit = sectors[0] ? sectors[0].outerRadius/105 : scale;
    const width=useChartWidth()??0,height=useChartHeight()??0;
    const canvas = React.useRef<HTMLCanvasElement>(null), [ready, setReady] = React.useState(false);
    React.useLayoutEffect(() => {
        if (!data.length) return;
        let disposed = false, frame = 0;
        setReady(false);
        const render = () => {
            if (disposed)
                return;
            if (canvas.current && paintProfiler(canvas.current, data, unit))
                setReady(true);
            else
                frame = requestAnimationFrame(render);
        };
        render();
        return () => { disposed = true; cancelAnimationFrame(frame); };
    }, [data, unit, revision]);
    if (data.some((d) => !Number.isFinite(d.percentage) || d.percentage < 0))
        throw new Error("Profiler percentages must be finite and nonnegative");
    const percent = (v: number) => `${v.toFixed(2)}%`;
    if(!sectors.length) return null;
    const sector=sectors[0];
    return <foreignObject x={0} y={0} width={width} height={height} style={{pointerEvents:"none",overflow:"visible"}}><div data-slot="chart-profiler-frame" data-mc-ready={ready} style={{position:"relative",width,height}}>
      <canvas key="profiler-2d-surface" ref={canvas} aria-hidden="true" style={{
            position: "absolute",
            left: sector.cx - 130 * unit,
            top: sector.cy - 52 * unit,
            width: 260 * unit,
            height: 114 * unit,
            imageRendering: "pixelated",
        }}/>
      <NativeChartText text={rootName} x={5} y={5} scale={scale}/>
      <NativeChartText text={percent(globalPercentage)} x={265 - widthOf(percent(globalPercentage))} y={5} scale={scale}/>
      {data.map((item, i) => {
            const rgb = chartColorChannels(item.fill, canvas.current), color = (rgb[0]<<16)|(rgb[1]<<8)|rgb[2];
            const local = percent(item.percentage), global = percent(item.globalPercentage ?? item.percentage), y = 134 + i * 9;
            return (<React.Fragment key={i}>
            <NativeChartText text={`${item.name === "unspecified" ? "[?]" : `[${i + 1}]`} ${item.name}`} x={5} y={y} color={color} scale={scale}/>
            <NativeChartText text={local} x={215 - widthOf(local)} y={y} color={color} scale={scale}/>
            <NativeChartText text={global} x={265 - widthOf(global)} y={y} color={color} scale={scale}/>
          </React.Fragment>);
        })}
    </div></foreignObject>;
}
export { ChartFpsFrame, ChartProfilerFrame };
