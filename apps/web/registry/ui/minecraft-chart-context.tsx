"use client";
import * as React from "react";
import { Rectangle, Sector, useChartWidth, useChartHeight, usePlotArea, type BarShapeProps, type PieSectorShapeProps } from "recharts";
import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import { minecraftGlyphs } from "./minecraft-font";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

type Geometry = { kind: "bar"; x: number; y: number; width: number; height: number; fill: string; index: number; value: number } |
  { kind: "sector"; cx: number; cy: number; outerRadius: number; innerRadius: number; startAngle: number; endAngle: number; percent: number; index: number; name: string; globalPercentage?: number; fill: string };
type GeometryStore = { entries: Map<string, Geometry>; version: number; listeners: Set<() => void>; scale: 1 | 2 | 3 };
const Context = React.createContext<GeometryStore | null>(null);
export function chartColorChannels(color: string, element?: Element | null): number[] {
  const variable = /^var\(\s*(--[^,)]+)(?:,\s*([^)]*))?\)/.exec(color);
  if (variable) color = (element ? getComputedStyle(element).getPropertyValue(variable[1]).trim() : "") || variable[2] || "#55ff55";
  if (/^#[\da-f]{6}$/i.test(color)) return [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
  if (/^#[\da-f]{3}$/i.test(color)) return [1, 2, 3].map(index => parseInt(color[index] + color[index], 16));
  if (/^rgb/.test(color)) return (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const canvas = document.createElement("canvas"), context = canvas.getContext("2d")!;
  context.fillStyle = color; context.fillRect(0, 0, 1, 1);
  return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
}
export function ChartGeometryProvider({ scale, children, host, colors }: { scale: 1 | 2 | 3; children: React.ReactNode; host: React.RefObject<HTMLDivElement | null>; colors: unknown }) {
  const [store] = React.useState<GeometryStore>(() => ({ entries: new Map(), version: 0, listeners: new Set(), scale }));
  store.scale = scale;
  React.useLayoutEffect(() => { store.version++; store.listeners.forEach(listener=>listener()); },[store,colors,scale]);
  React.useLayoutEffect(() => {
    const observer=new MutationObserver(()=>{store.version++;store.listeners.forEach(listener=>listener());});
    for(let node:HTMLElement|null=host.current;node;node=node.parentElement)observer.observe(node,{attributes:true,attributeFilter:["class","style","data-theme"]});
    return ()=>observer.disconnect();
  },[store,host]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
function useStore() { const store = React.useContext(Context); if (!store) throw new Error("Pixel chart parts require ChartContainer"); return store; }
export function ChartAxisTick({x=0,y=0,dy=0,payload,textAnchor="middle",tickFormatter=String}: {x?:number|string;y?:number|string;dy?:number|string;payload?:{value?:string|number};textAnchor?:string;tickFormatter?:(value:string|number)=>string}) {
  const {scale}=useChartGeometry(),text=tickFormatter(payload?.value??""),[,refresh]=React.useReducer(value=>value+1,0);
  React.useEffect(()=>{let live=true;if(/[^\x20-\x7e]/.test(text))loadUnihex().then(()=>{if(live)refresh();});return()=>{live=false;};},[text]);
  const width=Array.from(text).reduce((sum,char)=>sum+(minecraftGlyphs[char.charCodeAt(0)-32]?.[2]??getUnihexGlyph(char)?.advance??10),0);
  const left=Math.round(Number(x)/scale)-(textAnchor==="end"?width:textAnchor==="middle"?Math.floor(width/2):0);
  return <foreignObject x={left*scale} y={(Math.round((Number(y)+Number(dy))/scale)-4)*scale} width={(width+1)*scale} height={10*scale} pointerEvents="none"><MinecraftDisclosureText scale={scale}>{text}</MinecraftDisclosureText></foreignObject>;
}
export function useChartGeometry() {
  const store = useStore();
  React.useSyncExternalStore(React.useCallback(listener => { store.listeners.add(listener); return () => { store.listeners.delete(listener); }; }, [store]), () => store.version, () => 0);
  return { entries: [...store.entries.values()].sort((a, b) => a.index - b.index), scale: store.scale, revision: store.version };
}
function useRegister(geometry: Geometry) {
  const store = useStore(), id = React.useId(), serialized = JSON.stringify(geometry);
  React.useLayoutEffect(() => {
    store.entries.set(id, JSON.parse(serialized) as Geometry);
    store.version++; store.listeners.forEach(listener => listener());
    return () => { store.entries.delete(id); store.version++; store.listeners.forEach(listener => listener()); };
  }, [store, id, serialized]);
}
/** Recharts owns the coordinates, scales, stacking, hit testing and tooltip state. */
export function ChartPixelBar(props: BarShapeProps) { return <PixelBarGeometry {...props}/>; }
function PixelBarGeometry(props: BarShapeProps) {
  useRegister({ kind: "bar", x: props.x, y: props.y, width: props.width, height: props.height, fill: props.fill ?? "#55ff55", index: props.index, value: Number(props.value) });
  return <Rectangle {...props} fill="transparent" stroke="none" />;
}
/** A Pie shape adapter, not a second Pie implementation or data API. */
export function ChartProfilerSector(props: PieSectorShapeProps) { return <ProfilerSectorGeometry {...props}/>; }
function ProfilerSectorGeometry(props: PieSectorShapeProps) {
  useRegister({ kind: "sector", cx: props.cx, cy: props.cy, outerRadius: props.outerRadius, innerRadius: props.innerRadius, startAngle: props.startAngle, endAngle: props.endAngle, percent: props.percent ?? 0, index: props.index, name: String(props.name ?? ""), globalPercentage: props.payload?.globalPercentage, fill: props.fill ?? "#55ff55" });
  return <Sector {...props} transform={`translate(0 ${props.cy / 2}) scale(1 .5)`} fill="transparent" stroke="none" />;
}
/** Quantize Recharts' rendered SVG geometry; Recharts retains every data and layout API. */
export function ChartPixelSurface({background="#202020"}:{background?:string}) {
  const {scale,revision}=useChartGeometry(), chartWidth=useChartWidth()??0,chartHeight=useChartHeight()??0,plot=usePlotArea();
  const x=plot?.x??0,y=plot?.y??0,width=plot?.width??chartWidth,height=plot?.height??chartHeight;
  const canvas=React.useRef<HTMLCanvasElement>(null),[paint,setPaint]=React.useState(0),[ready,setReady]=React.useState(false);
  React.useLayoutEffect(()=>{
    const svg=canvas.current?.closest("svg.recharts-surface");if(!svg)return;
    const observer=new MutationObserver(records=>{if(records.some(record=>record.target instanceof SVGElement&&!record.target.closest("foreignObject")))setPaint(value=>value+1);});
    observer.observe(svg,{subtree:true,childList:true,attributes:true});
    return()=>{observer.disconnect();svg.querySelectorAll("[data-mc-pixel-source]").forEach(element=>element.removeAttribute("data-mc-pixel-source"));};
  },[]);
  React.useLayoutEffect(()=>{
    const node=canvas.current,ctx=node?.getContext("2d"),svg=node?.closest<SVGSVGElement>("svg.recharts-surface");if(!node||!ctx||!svg)return;
    node.width=Math.max(1,Math.floor(width/scale));node.height=Math.max(1,Math.floor(height/scale));
    ctx.fillStyle=background;ctx.fillRect(0,0,node.width,node.height);
    const scratch=document.createElement("canvas");scratch.width=node.width;scratch.height=node.height;
    const mask=scratch.getContext("2d")!,colorCanvas=document.createElement("canvas");colorCanvas.width=colorCanvas.height=1;
    const colorContext=colorCanvas.getContext("2d")!,colors=new Map<string,{ink:string;alpha:number}>();
    const color=(value:string)=>{
      if(!value||value==="none")return null;
      if(!colors.has(value)){colorContext.clearRect(0,0,1,1);colorContext.fillStyle=value;colorContext.fillRect(0,0,1,1);const c=colorContext.getImageData(0,0,1,1).data;colors.set(value,{ink:`rgb(${c[0]},${c[1]},${c[2]})`,alpha:c[3]/255});}
      return colors.get(value)!;
    };
    const selector=".recharts-rectangle,.recharts-curve,.recharts-sector,.recharts-polygon,.recharts-dot,.recharts-cartesian-grid line,.recharts-polar-grid path,.recharts-polar-grid line,.recharts-polar-grid polygon,.recharts-polar-grid circle";
    let count=0;
    for(const element of svg.querySelectorAll<SVGGraphicsElement>(selector)){
      if(element.closest("foreignObject,defs"))continue;
      // Keep the real SVG shapes for Recharts interaction; only the pixel surface paints them.
      if(!element.hasAttribute("data-mc-pixel-source"))element.setAttribute("data-mc-pixel-source","");
      const style=getComputedStyle(element);let opacity=1,visible=true;
      for(let parent:Element|null=element;parent&&parent!==svg;parent=parent.parentElement){const s=getComputedStyle(parent);if(s.display==="none"||s.visibility==="hidden"){visible=false;break;}opacity*=Number(s.opacity);}
      if(!visible||opacity===0)continue;
      const path=new Path2D(),n=(name:string)=>Number(element.getAttribute(name)??0),tag=element.tagName.toLowerCase();
      if(tag==="path"){const d=element.getAttribute("d");if(!d)continue;path.addPath(new Path2D(d));}
      else if(tag==="line"){path.moveTo(n("x1"),n("y1"));path.lineTo(n("x2"),n("y2"));}
      else if(tag==="circle"){if(![n("cx"),n("cy"),n("r")].every(Number.isFinite))continue;path.arc(n("cx"),n("cy"),Math.max(0,n("r")),0,Math.PI*2);}
      else if(tag==="rect")path.rect(n("x"),n("y"),n("width"),n("height"));
      else if(tag==="polygon"||tag==="polyline"){const points=(element.getAttribute("points")?.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)??[]).map(Number);for(let i=0;i+1<points.length;i+=2){if(i)path.lineTo(points[i],points[i+1]);else path.moveTo(points[i],points[i+1]);}if(tag==="polygon")path.closePath();}
      else continue;
      const rootMatrix=svg.getCTM(),matrix=element.getCTM();
      const stamp=(value:string,alpha:number,stroke:boolean)=>{
        const ink=color(value);if(!ink||ink.alpha===0||alpha===0)return;
        mask.setTransform(1,0,0,1,0,0);mask.clearRect(0,0,scratch.width,scratch.height);
        mask.setTransform(1/scale,0,0,1/scale,-Math.floor(x/scale),-Math.floor(y/scale));
        if(rootMatrix&&matrix){const relative=rootMatrix.inverse().multiply(matrix);mask.transform(relative.a,relative.b,relative.c,relative.d,relative.e,relative.f);}
        if(stroke){mask.strokeStyle=ink.ink;mask.lineWidth=Math.max(scale,Math.round(parseFloat(style.strokeWidth)/scale)*scale);mask.setLineDash(style.strokeDasharray==="none"?[]:style.strokeDasharray.split(/[ ,]+/).map(value=>parseFloat(value)));mask.stroke(path);}
        else{mask.fillStyle=ink.ink;mask.fill(path,style.fillRule==="evenodd"?"evenodd":"nonzero");}
        const image=mask.getImageData(0,0,scratch.width,scratch.height);
        for(let i=3;i<image.data.length;i+=4)image.data[i]=image.data[i]>=128?255:0;
        mask.putImageData(image,0,0);ctx.globalAlpha=opacity*alpha*ink.alpha;ctx.drawImage(scratch,0,0);ctx.globalAlpha=1;
      };
      stamp(style.fill,Number(style.fillOpacity),false);stamp(style.stroke,Number(style.strokeOpacity),true);count++;
    }
    setReady(count>0);
  },[paint,revision,scale,width,height,x,y,background]);
  return <foreignObject x={x} y={y} width={width} height={height} pointerEvents="none"><div style={{width:"100%",height:"100%",background}}><style>{".mc-chart [data-mc-pixel-source]{filter:opacity(0)!important}"}</style><canvas ref={canvas} aria-hidden="true" data-mc-ready={ready} style={{width:Math.max(1,Math.floor(width/scale))*scale,height:Math.max(1,Math.floor(height/scale))*scale,imageRendering:"pixelated",pointerEvents:"none",display:"block"}}/></div></foreignObject>;
}
