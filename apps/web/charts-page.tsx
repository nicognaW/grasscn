import * as React from "react";
import { Button } from "./registry/ui/button";
import { Card } from "./registry/ui/card";
import { AnalyticsChartExample, type AnalyticsChartType } from "./registry/blocks/chart-analytics";
import { FpsChartExample } from "./registry/blocks/chart-fps";
import { ProfilerChartExample } from "./registry/blocks/chart-profiler";
import { chartCode } from "./chart-code";
import { CopyCode, DocsRail } from "./components-page";
const types = [['overview', 'Overview'], ['metric', 'F3 metrics'], ['profiler', 'F3 breakdown'], ['fps', 'F3 frame time'], ['bar', 'Bar'], ['stacked-bar', 'Stacked bar'], ['line', 'Line'], ['area', 'Area'], ['pie', 'Pie'], ['donut', 'Donut'], ['radar', 'Radar'], ['radial', 'Radial']];
const visitors = [{ name: 'Jan', desktop: 186, mobile: 80 }, { name: 'Feb', desktop: 305, mobile: 200 }, { name: 'Mar', desktop: 237, mobile: 120 }, { name: 'Apr', desktop: 273, mobile: 190 }, { name: 'May', desktop: 309, mobile: 210 }, { name: 'Jun', desktop: 354, mobile: 240 }];
const browsers = [{ name: 'Chrome', visitors: 275 }, { name: 'Safari', visitors: 200 }, { name: 'Firefox', visitors: 187 }, { name: 'Edge', visitors: 173 }, { name: 'Other', visitors: 90 }];
const config = { desktop: { label: 'Desktop', color: '#55ff55' }, mobile: { label: 'Mobile', color: '#55ffff' }, visitors: { label: 'Visitors', color: '#aaffaa' } };
function Example({ title, description, children, code }: {
    title: string;
    description: string;
    children: React.ReactNode;
    code?: string;
}) {
    const [showCode, setShowCode] = React.useState(false);
    return <Card scale={2} className="chart-example" role="region" aria-label={title}><div className="chart-example-heading"><h2>{title}</h2>{code && <Button scale={1} aria-label={`View ${title} code`} aria-expanded={showCode} onClick={() => setShowCode(v => !v)}>{showCode ? 'Preview' : 'Code'}</Button>}</div><p>{description}</p>{showCode && code ? <CopyCode text={code} label={`${title} code`}/> : <div className="chart-example-body">{children}</div>}</Card>;
}
function NativePlot({ children }: {
    children: (scale: 1 | 2) => React.ReactNode;
}) {
    const ref = React.useRef<HTMLDivElement>(null), [scale, setScale] = React.useState<1 | 2>(1);
    React.useLayoutEffect(() => { const node = ref.current!; const measure = () => setScale(node.clientWidth >= 560 ? 2 : 1); measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect(); }, []);
    return <div ref={ref} className="chart-native-fit">{children(scale)}</div>;
}
export default function ChartsPage({ type = 'overview' }: {
    type?: string;
}) {
    const selected = types.some(t => t[0] === type) ? type : 'overview', title = selected === 'overview' ? 'Charts' : `${types.find(t => t[0] === selected)?.[1]} charts`;
    const samples = React.useMemo(() => Array.from({ length: 240 }, (_, i) => [86, 112, 98, 172, 146, 104, 132, 220, 158, 94, 121, 188][i % 12]), []);
    const metric = <Example title="API response time" description="Response latency across the latest requests." code={chartCode("metric", samples.slice(0,12).map(value=>({value})),["value"])}><NativePlot>{scale => <FpsChartExample aria-label="API response time" data={samples.map(value=>({value}))} dataKey="value" domain={[0,300]} guides={[{value:300,label:"300 ms"},{value:150,label:"150 ms"}]} scale={scale}/>}</NativePlot></Example>;
    const profiler = <Example title="Browser share" description="Visitor distribution by browser." code={chartCode("profiler",browsers,["visitors"])}><NativePlot>{scale => <ProfilerChartExample aria-label="Browser share" rootName="Visitors" data={browsers} dataKey="visitors" scale={scale}/>}</NativePlot></Example>;
    const fps = <Example title="Frame timing" description="Rendering performance across a sequence of frames." code={chartCode("fps",samples.slice(0,12).map(value=>({value:value/10})),["value"])}><NativePlot>{scale => <FpsChartExample aria-label="Frame timing" data={samples.map(value=>({value:value/10}))} dataKey="value" framerateLimit={120} scale={scale}/>}</NativePlot></Example>;
    const circular = ['pie', 'donut', 'radial'].includes(selected);
    return <div className="docs-layout charts-layout"><DocsRail title="Charts"><nav aria-label="Chart types">{types.map(([key, label]) => <Button render={<a aria-current={key === selected ? "page" : undefined} href={`/charts${key === "overview" ? "" : `/${key}`}`}/>} key={key} scale={2} className="docs-nav-button">{label}</Button>)}</nav><a className="docs-index-link" href="/components">All components</a></DocsRail><main id="content" className="docs-main"><nav className="docs-breadcrumb" aria-label="Breadcrumb"><a href="/charts">Charts</a>{selected !== 'overview' && <><span>/</span><span>{types.find(t => t[0] === selected)?.[1]}</span></>}</nav><div className="docs-intro"><h1>{title}</h1><p>Make your data feel at home. Explore pixel charts, F3 renderers and examples with everyday web data.</p></div>
 {selected === 'overview' ? <><div className="chart-type-links">{types.slice(1).map(([key, label]) => <Button render={<a href={`/charts/${key}`}/>} key={key} scale={2}>{label}</Button>)}</div><div className="charts-examples">{metric}{profiler}<Example title="Website visitors" description="Desktop and mobile traffic from January to June." code={chartCode("bar", visitors, ["desktop", "mobile"])}><AnalyticsChartExample aria-label="Website visitor analytics" type="bar" data={visitors} series={['desktop', 'mobile']} config={config} scale={1}/></Example>{fps}</div></> : <div className="charts-examples">{selected === 'metric' ? <>{metric}<Example title="Request volume" description="Incoming requests per minute."><NativePlot>{scale => <FpsChartExample aria-label="Request volume" data={samples.map(v=>({value:Math.round(v/3)}))} dataKey="value" domain={[0, 100]} formatValue={v=>`${Math.round(v)} req`} guides={[{value:100,label:"100 req"},{value:50,label:"50 req"}]} scale={scale}/>}</NativePlot></Example></> : selected === 'profiler' ? profiler : selected === 'fps' ? fps : <><Example title={circular ? 'Browser visitors' : 'Website visitors'} description={circular ? 'A comparison of browser usage.' : 'Desktop and mobile traffic over six months.'} code={chartCode(selected, circular ? browsers : visitors, circular ? ["visitors"] : ["desktop", "mobile"])}><AnalyticsChartExample aria-label="Visitor analytics" type={selected as AnalyticsChartType} data={circular ? browsers : visitors} series={circular ? ['visitors'] : ['desktop', 'mobile']} config={config} scale={1}/></Example><Example title="Traffic sources" description="How visitors discover your website." code={chartCode(selected, [{ name: "Direct", visitors: 310 }, { name: "Search", visitors: 450 }, { name: "Social", visitors: 180 }, { name: "Referral", visitors: 120 }], ["visitors"])}><AnalyticsChartExample aria-label="Acquisition analytics" type={selected as AnalyticsChartType} data={[{ name: 'Direct', visitors: 310 }, { name: 'Search', visitors: 450 }, { name: 'Social', visitors: 180 }, { name: 'Referral', visitors: 120 }]} series={['visitors']} config={config} scale={1}/></Example></>}</div>}
 <section className="charts-install"><h2>Installation</h2><p>Add the chart components to your project.</p><CopyCode text="npx shadcn@latest add http://127.0.0.1:5173/r/chart.json" label="chart installation" language="bash"/></section></main></div>;
}
