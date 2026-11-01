function example(source:string) {
  const index=source.indexOf("\n<ChartContainer");
  return '"use client"\n\n'+source.slice(0,index)+"\n\nexport function ChartExample() {\n  return (\n"+source.slice(index+1).split("\n").map(line=>"    "+line).join("\n")+"\n  )\n}\n";
}
export function chartCode(type: string, data: unknown, series: string[] = ["value"]) {
  const key=series[0];
  if(type==="profiler")return example(`import { PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartProfilerSector, ChartProfilerFrame, ChartTooltip, ChartTooltipContent, chartProfilerColor } from "@/components/ui/chart"

const data = ${JSON.stringify(data,null,2)}

<ChartContainer config={{ ${key}: { label: "Visitors" } }} style={{ width: 540, height: ${(139+(Array.isArray(data)?data.length:0)*9)*2}, background: "rgba(80,80,80,0.5647058823529412)" }}>
  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
    <Pie data={data} dataKey="${key}" nameKey="name" cx={270} cy={134} outerRadius={210}
      startAngle={-90} endAngle={270} isAnimationActive={false} shape={ChartProfilerSector}>
      {data.map(row => <Cell key={row.name} fill={chartProfilerColor(row.name)} />)}
    </Pie>
    <ChartProfilerFrame rootName="Visitors" />
    <ChartTooltip content={<ChartTooltipContent />} />
  </PieChart>
</ChartContainer>`);
  if(type==="metric"||type==="fps")return example(`import { BarChart, Bar, Cell, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartPixelBar, ChartFpsFrame, ChartTooltip, ChartTooltipContent, chartFpsColor } from "@/components/ui/chart"

const pattern = ${JSON.stringify(data,null,2)}
const data = Array.from({ length: 240 }, (_, index) => pattern[index % pattern.length])
const values = data.map(row => row.${key})
const labels = [Math.min(...values), values.reduce((sum,value) => sum + value,0) / values.length, Math.max(...values)]
  .map((value,index) => Math.round(value) + " ms " + ["min","avg","max"][index])

<ChartContainer config={{ ${key}: { label: "Response time", color: "#55ff55" } }} style={{ width: 484, height: 138 }}>
  <BarChart data={data} barCategoryGap={0} barGap={0} margin={{ top: 18, left: 2, right: 2, bottom: 0 }}>
    <XAxis hide padding={{ left: 0, right: 0 }} />
    <YAxis hide domain={[0, ${type==="fps"?1000/30:300}]} allowDataOverflow />
    <Bar dataKey="${key}" shape={ChartPixelBar} isAnimationActive={false}>
      {data.map((row,index) => <Cell key={index} fill={chartFpsColor(row.${key} / ${type==="fps"?1000/30:300} * (1000/30) * 1e6)} />)}
    </Bar>
    <ChartFpsFrame labels={labels} ${type==="metric"?'guides={[{ value: 150, label: "150 ms" }, { value: 300, label: "300 ms" }]}':''} />
    <ChartTooltip content={<ChartTooltipContent />} />
  </BarChart>
</ChartContainer>`);
  const root = ({line:"LineChart",area:"AreaChart",pie:"PieChart",donut:"PieChart",radar:"RadarChart",radial:"RadialBarChart"} as Record<string,string>)[type]??"BarChart";
  const primitive = ({line:"Line",area:"Area",pie:"Pie",donut:"Pie",radar:"Radar",radial:"RadialBar"} as Record<string,string>)[type]??"Bar";

  const polar=primitive==="Pie"||primitive==="RadialBar";
  return example(`import { ${root}, ${primitive}${polar?', Cell':primitive==='Radar'?', PolarAngleAxis':', XAxis, YAxis'} } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartPixelSurface, ChartAxisTick } from "@/components/ui/chart"

const data = ${JSON.stringify(data,null,2)}
const config = ${JSON.stringify(Object.fromEntries(series.map((key,i)=>[key,{label:key,color:i?'#5555ff':'#55ff55'}])),null,2)}
${polar?'const colors = ["#55ff55", "#5555ff", "#ffff55", "#ff5555", "#55ffff"]\n':''}

<ChartContainer config={config}>
  <${root} ${primitive==="Pie"?'': 'data={data}'}>
${primitive==='Radar'?'    <PolarAngleAxis dataKey="name" tick={<ChartAxisTick />} />\n':!polar?'    <XAxis dataKey="name" tick={<ChartAxisTick dy={8} />} />\n    <YAxis tick={<ChartAxisTick />} />\n':''}${series.map(key=>`    <${primitive} ${primitive==="Pie"?'data={data} nameKey="name" ':''}dataKey="${key}" ${type==="stacked-bar"?' stackId="visitors"':''}${type==="donut"?' innerRadius="45%"':''} fill="var(--color-${key})" stroke="var(--color-${key})" isAnimationActive={false}${polar?`>\n      {data.map((row,index) => <Cell key={row.name} fill={colors[index % colors.length]} />)}\n    </${primitive}>`:' />'}`).join('\n')}
    <ChartPixelSurface />
    <ChartTooltip content={<ChartTooltipContent />} />
  </${root}>
</ChartContainer>`);
}
