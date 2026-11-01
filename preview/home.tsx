import * as React from "react";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import { Textarea } from "../registry/ui/textarea";
import { Panel, Action } from "./showcase-panel";
import { Savings, Schedule, Feedback, Plan } from "./home-examples";
import { Checkbox } from "../registry/ui/checkbox";
import { Switch } from "../registry/ui/switch";
import { Slider } from "../registry/ui/slider";
import { Label } from "../registry/ui/label";
import { Avatar, AvatarImage } from "../registry/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../registry/ui/select";
import { AnalyticsChartExample, type AnalyticsChartType } from "../registry/blocks/chart-analytics";
import { FpsChartExample } from "../registry/blocks/chart-fps";
import { Message, MessageContent, MessageGroup } from "../registry/ui/message";
import { TitleScene } from "./title-scene";
import { SyntaxCode } from "./syntax-code";
import grass from "./assets/grass-block-48.png";
import "./home.css";
const traffic = [{ name: "Jan", visitors: 186, returning: 80 }, { name: "Feb", visitors: 305, returning: 160 }, { name: "Mar", visitors: 237, returning: 120 }, { name: "Apr", visitors: 273, returning: 190 }, { name: "May", visitors: 309, returning: 210 }, { name: "Jun", visitors: 354, returning: 240 }];
const chartConfig = { visitors: { label: "Visitors", color: "#55ff55" }, returning: { label: "Returning", color: "#55ffff" } };
const team = [{ name: "Alex Morgan", role: "Design engineer", skin: "slim/alex" }, { name: "Jordan Lee", role: "Frontend developer", skin: "wide/steve" }, { name: "Sam Rivera", role: "Product designer", skin: "wide/kai" }] as const;
function Controls() {
    const [clicks, setClicks] = React.useState(0), [checked, setChecked] = React.useState(true), [enabled, setEnabled] = React.useState(true);
    return <Panel title="Small pieces. Big possibilities." tag="THE ESSENTIALS">
  <div className="grass-inline"><Action onClick={() => setClicks(v => v + 1)}>Click me</Action><Action disabled>Disabled</Action></div>
  <Input scale={2} aria-label="Example name" placeholder="Your name"/>
  <Textarea scale={2} aria-label="Example message" placeholder="Leave a little inspiration..." style={{ height: 72 }}/>
  <div className="grass-control-row"><div className="grass-inline"><Checkbox id="home-remember" scale={2} checked={checked} onCheckedChange={v => setChecked(v === true)}/><Label htmlFor="home-remember" scale={2}>Remember me</Label></div><Switch aria-label="Enable example" scale={2} checked={enabled} onCheckedChange={setEnabled} style={{ width: 64 }}/></div>
  <div className="grass-panel-foot"><a href="/components/button">Explore the primitives</a><output aria-label="Example button clicks">{clicks ? `${clicks} clicks` : "Try it out"}</output></div>
 </Panel>;
}
function Analytics() {
    const [type, setType] = React.useState<AnalyticsChartType>("bar");
    return <Panel title="A good month to grow." description="Website traffic · January–June" tag="ANALYTICS">
  <div className="grass-stat-line"><strong>{traffic.reduce((sum, row) => sum + row.visitors, 0).toLocaleString("en-US")}</strong><span className="grass-positive">+18.6%</span></div>
  <div className="grass-inline grass-chart-tabs" aria-label="Traffic chart type">{(["bar", "area", "line"] as const).map(v => <Button key={v} scale={1} aria-pressed={type === v} onClick={() => setType(v)}>{(typeof v === "number" ? v : v[0]).toUpperCase() + v.slice(1)}</Button>)}</div>
  <AnalyticsChartExample aria-label="Website traffic" type={type} data={traffic} config={chartConfig} series={["visitors", "returning"]} scale={1} height={160}/>
  <div className="grass-two-stats"><div><span>Conversion rate</span><strong>4.28%</strong></div><div><span>Avg. session</span><strong>3m 42s</strong></div></div>
  <a href="/charts" className="grass-text-link">Explore all charts</a>
 </Panel>;
}
function Project() {
    const [name, setName] = React.useState("Website redesign"), [budget, setBudget] = React.useState("2400"), [category, setCategory] = React.useState("design"), [saved, setSaved] = React.useState("");
    return <Panel title="Start something new." description="Give your project a place to start." tag="NEW PROJECT">
  <form className="grass-form" onSubmit={e => { e.preventDefault(); setSaved(name.trim()); }}>
   <label>Project name<Input aria-label="Project name" scale={2} required value={name} onChange={e => setName(e.target.value)}/></label>
   <div className="grass-form-row"><label>Budget ($)<Input aria-label="Project budget" scale={2} type="number" min="1" required value={budget} onChange={e => setBudget(e.target.value)}/></label><label>Category<Select items={{design:"Design",engineering:"Engineering",marketing:"Marketing"}} scale={2} value={category} onValueChange={value => setCategory(value ?? "")}><SelectTrigger aria-label="Project category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="design">Design</SelectItem><SelectItem value="engineering">Engineering</SelectItem><SelectItem value="marketing">Marketing</SelectItem></SelectContent></Select></label></div>
   <label>Brief<Textarea aria-label="Project brief" scale={2} placeholder="What are we building?" style={{ height: 80 }}/></label>
   <Action type="submit">Create project</Action>
   <output className="grass-form-result" aria-live="polite" aria-label="Project result">{saved ? `Created: ${saved}` : "Your next great thing starts here."}</output>
  </form>
 </Panel>;
}
function Team() {
    const [invited, setInvited] = React.useState(false);
    return <Panel title="Better, together." description="The people behind your next launch." tag="YOUR TEAM">
  <div className="grass-team">{team.map(person => <div className="grass-team-member" key={person.name}><Avatar scale={2} size="lg"><AvatarImage skin={person.skin} alt={person.name}/></Avatar><div><strong>{person.name}</strong><span>{person.role}</span></div></div>)}</div>
  <Action onClick={() => setInvited(true)} disabled={invited}>{invited ? "Invitation ready" : "Invite teammate"}</Action>
  {invited && <p role="status" className="grass-note">Demo invitation prepared. No email sent.</p>}
 </Panel>;
}
function Tasks() {
    const [done, setDone] = React.useState([true, true, false, false]);
    const tasks = ["Define the design tokens", "Build the component library", "Polish the onboarding flow", "Ship something memorable"];
    return <Panel title="One step closer to shipped." tag="LAUNCH CHECKLIST"><div className="grass-task-list">{tasks.map((task, i) => <div className="grass-task" key={task}><Checkbox scale={2} id={`home-task-${i}`} checked={done[i]} onCheckedChange={v => setDone(old => old.map((x, j) => j === i ? v === true : x))}/><label htmlFor={`home-task-${i}`} className={done[i] ? "grass-done" : ""}>{task}</label></div>)}</div><div className="grass-panel-foot"><output aria-label="Launch progress">{done.filter(Boolean).length} of 4 complete</output><a href="/components/checkbox">Checkbox</a></div></Panel>;
}
function Revenue() { return <Panel title="Your work, paying off." tag="THIS MONTH"><div className="grass-stat-line"><strong>$8,420.00</strong></div><p className="grass-positive">+$1,284.50 from last month</p><dl className="grass-ledger"><div><dt>Subscriptions</dt><dd>$6,240.00</dd></div><div><dt>One-time sales</dt><dd>$2,460.00</dd></div><div><dt>Refunds & fees</dt><dd>−$280.00</dd></div><div><dt>Net revenue</dt><dd>$8,420.00</dd></div></dl><div className="grass-panel-foot"><span>USD</span><a href="/components/table">View tables</a></div></Panel>; }
function Preferences() {
    const [email, setEmail] = React.useState(true), [release, setRelease] = React.useState(false), [saved, setSaved] = React.useState(false);
    return <Panel title="Keep the good stuff coming." tag="NOTIFICATIONS"><div className="grass-preference"><div><label htmlFor="home-email">Project updates</label><p>Milestones, mentions and messages.</p></div><Switch id="home-email" aria-label="Project updates" scale={2} checked={email} onCheckedChange={v => { setEmail(v); setSaved(false); }} style={{ width: 64 }}/></div><div className="grass-preference"><div><label htmlFor="home-release">Product news</label><p>Fresh features, once in a while.</p></div><Switch id="home-release" aria-label="Product news" scale={2} checked={release} onCheckedChange={v => { setRelease(v); setSaved(false); }} style={{ width: 64 }}/></div><Action onClick={() => setSaved(true)}>Save preferences</Action><output aria-live="polite" aria-label="Preferences status" className="grass-note">{saved ? "Preferences saved for this demo." : "Make yourself at home."}</output></Panel>;
}
function Chat() {
    const [draft, setDraft] = React.useState(""), [messages, setMessages] = React.useState([{ author: "Alex", text: "The new dashboard looks great!" }, { author: "Jordan", text: "Those pixel charts are so good." }]);
    const list = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const el = list.current;
        if (el)
            el.scrollTop = el.scrollHeight;
    }, [messages]);
    return <Panel title="A little more human." description="#design · 3 teammates" tag="TEAM CHAT"><div className="grass-chat-log" ref={list} role="log" aria-label="Team conversation"><MessageGroup>{messages.map((message, i) => <Message scale={2} author={message.author} key={i}><MessageContent>{message.text}</MessageContent></Message>)}</MessageGroup></div><form className="grass-chat-compose" onSubmit={e => {
            e.preventDefault();
            if (draft.trim()) {
                setMessages(old => [...old, { author: "You", text: draft.trim() }]);
                setDraft("");
            }
        }}><Input scale={2} aria-label="Team message" placeholder="Say something nice..." value={draft} onChange={e => setDraft(e.target.value)}/><Action type="submit" disabled={!draft.trim()}>Send</Action></form><p className="grass-note">Keep the conversation going.</p></Panel>;
}
function Performance() {
    const [sample, setSample] = React.useState(0);
    const data = React.useMemo(() => Array.from({ length: 180 }, (_, i) => [42, 64, 53, 88, 69, 57, 82, 103, 71, 49, 60, 76][(i + sample) % 12]), [sample]);
    const container = React.useRef<HTMLDivElement>(null), [width, setWidth] = React.useState(140);
    React.useLayoutEffect(() => { const el = container.current!; const measure = () => setWidth(Math.max(40, Math.min(242, Math.floor(el.clientWidth)))); measure(); const o = new ResizeObserver(measure); o.observe(el); return () => o.disconnect(); }, []);
    return <Panel title="Old-school pixels. Live insights." description="API response time · last 180 requests" tag="VANILLA F3, REIMAGINED"><div className="grass-native-chart" ref={container}><FpsChartExample aria-label="API response time example" data={data.map(value=>({value}))} dataKey="value" domain={[0, 150]} formatValue={v=>`${Math.round(v)} ms`} guides={[{value:150,label:"150 ms"},{value:75,label:"75 ms"}]} width={width} scale={1}/></div><div className="grass-panel-foot"><span className="grass-positive">All systems operational</span><button className="grass-text-link" onClick={() => setSample(v => v + 1)}>Refresh sample</button></div></Panel>;
}
function Payout() {
    const [amount, setAmount] = React.useState(250), [saved, setSaved] = React.useState(false);
    return <Panel title="Set your own pace." description="Choose when your earnings are paid out." tag="PAYOUT SETTINGS"><div className="grass-between"><label htmlFor="home-threshold">Minimum balance</label><strong>${amount.toLocaleString("en-US")}</strong></div><Slider id="home-threshold" scale={2} aria-label="Payout threshold" min={50} max={1000} step={25} value={[amount]} label={`$${amount}`} onValueChange={v => { setAmount((typeof v === "number" ? v : v[0])); setSaved(false); }}/><div className="grass-between grass-note"><span>$50 min</span><span>$1,000 max</span></div><Action onClick={() => setSaved(true)}>Save threshold</Action><output className="grass-note" aria-live="polite" aria-label="Payout status">{saved ? `Threshold set to $${amount}.` : "Your balance. Your call."}</output></Panel>;
}
function Install() {
    const [item, setItem] = React.useState("button"), [copied, setCopied] = React.useState(false), [error, setError] = React.useState("");
    const command = `npx shadcn@latest add http://127.0.0.1:5173/r/${item}.json`;
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setError("");
        }
        catch {
            setError("Select the command and copy it manually.");
        }
    };
    return <section className="grass-install" id="install" aria-labelledby="install-title"><img src={grass} width="48" height="48" alt="Grass block"/><span className="grass-kicker">COPY. CUSTOMIZE. BUILD.</span><h2 id="install-title">Place your first component.</h2><div className="grass-install-picker"><Select scale={2} value={item} onValueChange={v => { setItem(v ?? ""); setCopied(false); }}><SelectTrigger aria-label="Component to install"><SelectValue /></SelectTrigger><SelectContent>{["button", "input", "card", "chart", "combobox"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div className="grass-command"><SyntaxCode text={command} language="bash"/><Button scale={2} onClick={copy}>{copied ? "Copied" : "Copy"}</Button></div><p className="grass-note" role="status">{error || "Add to a project initialized with shadcn."}</p></section>;
}
export default function Home() {
    return <div className="grass-home" id="home"><a className="grass-skip" href="/#examples">Skip to examples</a><main id="content">
 <section className="grass-hero" aria-labelledby="grass-title"><a href="/#install" className="grass-announcement">grasscn <span>0.2</span></a><TitleScene /><p className="grass-title-tagline">Pixel-perfect Minecraft UI.</p><p>shadcn components. Yours to build.</p><div className="grass-hero-actions"><Button render={<a href="/#install"/>} scale={2}>{"Get started"}</Button><Button render={<a href="/components"/>} scale={2}>{"Browse components"}</Button></div></section>
 <section className="grass-examples" id="examples" aria-label="Interactive application examples"><div className="grass-examples-heading"><span>BUILT WITH GRASSCN</span><span>Interactive examples</span></div><div className="grass-showcase-grid"><div className="grass-showcase-column"><Controls /><Tasks /><Performance /><Feedback /></div><div className="grass-showcase-column"><Analytics /><Revenue /><Savings /></div><div className="grass-showcase-column"><Project /><Payout /><Schedule /></div><div className="grass-showcase-column"><Team /><Chat /><Preferences /><Plan /></div></div></section>
 <Install />
 </main></div>;
}
