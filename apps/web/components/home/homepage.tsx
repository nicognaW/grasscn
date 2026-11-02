"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import grass from "../../assets/grass-block-48.png";
import {
  AnalyticsChartExample,
  type AnalyticsChartType,
} from "../../registry/blocks/chart-analytics";
import { FpsChartExample } from "../../registry/blocks/chart-fps";
import { Avatar, AvatarImage } from "../../registry/ui/avatar";
import { Button } from "../../registry/ui/button";
import { Checkbox } from "../../registry/ui/checkbox";
import { Input } from "../../registry/ui/input";
import { Label } from "../../registry/ui/label";
import {
  Message,
  MessageContent,
  MessageGroup,
} from "../../registry/ui/message";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../registry/ui/select";
import { Slider } from "../../registry/ui/slider";
import { Switch } from "../../registry/ui/switch";
import { Textarea } from "../../registry/ui/textarea";
import { DocumentText } from "../document-text";
import { InstallationCommand } from "../installation-command";
import { Savings, Schedule, Feedback, Plan } from "./application-examples";
import { Panel, Action } from "./showcase-panel";
import { TitleScene } from "./title-scene";

import "./homepage.css";

const traffic = [
  { name: "Jan", visitors: 186, returning: 80 },
  { name: "Feb", visitors: 305, returning: 160 },
  { name: "Mar", visitors: 237, returning: 120 },
  { name: "Apr", visitors: 273, returning: 190 },
  { name: "May", visitors: 309, returning: 210 },
  { name: "Jun", visitors: 354, returning: 240 },
];

const chartConfig = {
  visitors: { label: "Visitors", color: "#55ff55" },
  returning: { label: "Returning", color: "#55ffff" },
};

const team = [
  { name: "Alex Morgan", role: "Design engineer", skin: "slim/alex" },
  { name: "Jordan Lee", role: "Frontend developer", skin: "wide/steve" },
  { name: "Sam Rivera", role: "Product designer", skin: "wide/kai" },
] as const;

function Controls() {
  const [clicks, setClicks] = React.useState(0);
  const [checked, setChecked] = React.useState(true);
  const [enabled, setEnabled] = React.useState(true);

  return (
    <Panel title="Small pieces. Big possibilities." tag="THE ESSENTIALS">
      <div className="grass-inline">
        <Action
          onClick={() => {
            setClicks((v) => v + 1);
          }}
        >
          Click me
        </Action>
        <Action disabled>Disabled</Action>
      </div>
      <Input scale={2} aria-label="Example name" placeholder="Your name" />
      <Textarea
        scale={2}
        aria-label="Example message"
        placeholder="Leave a little inspiration..."
        style={{ height: 72 }}
      />
      <div className="grass-control-row">
        <div className="grass-inline">
          <Checkbox
            id="home-remember"
            scale={2}
            checked={checked}
            onCheckedChange={(v) => {
              setChecked(v === true);
            }}
          />
          <Label htmlFor="home-remember" scale={2}>
            Remember me
          </Label>
        </div>
        <Switch
          aria-label="Enable example"
          scale={2}
          checked={enabled}
          onCheckedChange={setEnabled}
          style={{ width: 64 }}
        />
      </div>
      <div className="grass-panel-foot">
        <Link href="/docs/components/button">
          <DocumentText>Explore the primitives</DocumentText>
        </Link>
        <output aria-label="Example button clicks">
          <DocumentText>
            {clicks ? `${clicks} clicks` : "Try it out"}
          </DocumentText>
        </output>
      </div>
    </Panel>
  );
}

function Analytics() {
  const [type, setType] = React.useState<AnalyticsChartType>("bar");

  return (
    <Panel
      title="A good month to grow."
      description="Website traffic · January–June"
      tag="ANALYTICS"
    >
      <div className="grass-stat-line">
        <strong>
          <DocumentText>
            {traffic
              .reduce((sum, row) => sum + row.visitors, 0)
              .toLocaleString("en-US")}
          </DocumentText>
        </strong>
        <span className="grass-positive">
          <DocumentText>+18.6%</DocumentText>
        </span>
      </div>
      <div
        className="grass-inline grass-chart-tabs"
        aria-label="Traffic chart type"
      >
        {(["bar", "area", "line"] as const).map((v) => (
          <Button
            key={v}
            scale={1}
            aria-pressed={type === v}
            onClick={() => {
              setType(v);
            }}
          >
            {(typeof v === "number" ? v : v[0]).toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </div>
      <AnalyticsChartExample
        aria-label="Website traffic"
        type={type}
        data={traffic}
        config={chartConfig}
        series={["visitors", "returning"]}
        scale={1}
        height={160}
      />
      <div className="grass-two-stats">
        <div>
          <span>
            <DocumentText>Conversion rate</DocumentText>
          </span>
          <strong>
            <DocumentText>4.28%</DocumentText>
          </strong>
        </div>
        <div>
          <span>
            <DocumentText>Avg. session</DocumentText>
          </span>
          <strong>
            <DocumentText>3m 42s</DocumentText>
          </strong>
        </div>
      </div>
      <Link href="/charts" className="grass-text-link">
        <DocumentText>Explore all charts</DocumentText>
      </Link>
    </Panel>
  );
}

function Project() {
  const [name, setName] = React.useState("Website redesign");
  const [budget, setBudget] = React.useState("2400");
  const [category, setCategory] = React.useState("design");
  const [saved, setSaved] = React.useState("");

  return (
    <Panel
      title="Start something new."
      description="Give your project a place to start."
      tag="NEW PROJECT"
    >
      <form
        className="grass-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(name.trim());
        }}
      >
        <label>
          <DocumentText>Project name</DocumentText>
          <Input
            aria-label="Project name"
            scale={2}
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
        <div className="grass-form-row">
          <label>
            <DocumentText>Budget ($)</DocumentText>
            <Input
              aria-label="Project budget"
              scale={2}
              type="number"
              min="1"
              required
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
              }}
            />
          </label>
          <label>
            <DocumentText>Category</DocumentText>
            <Select
              items={{
                design: "Design",
                engineering: "Engineering",
                marketing: "Marketing",
              }}
              scale={2}
              value={category}
              onValueChange={(value) => {
                setCategory(value ?? "");
              }}
            >
              <SelectTrigger aria-label="Project category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <label>
          <DocumentText>Brief</DocumentText>
          <Textarea
            aria-label="Project brief"
            scale={2}
            placeholder="What are we building?"
            style={{ height: 80 }}
          />
        </label>
        <Action type="submit">Create project</Action>
        <output
          className="grass-form-result"
          aria-live="polite"
          aria-label="Project result"
        >
          <DocumentText>
            {saved ? `Created: ${saved}` : "Your next great thing starts here."}
          </DocumentText>
        </output>
      </form>
    </Panel>
  );
}

function Team() {
  const [invited, setInvited] = React.useState(false);

  return (
    <Panel
      title="Better, together."
      description="The people behind your next launch."
      tag="YOUR TEAM"
    >
      <div className="grass-team">
        {team.map((person) => (
          <div className="grass-team-member" key={person.name}>
            <Avatar scale={2} size="lg">
              <AvatarImage skin={person.skin} alt={person.name} />
            </Avatar>
            <div>
              <strong>
                <DocumentText>{person.name}</DocumentText>
              </strong>
              <span>
                <DocumentText>{person.role}</DocumentText>
              </span>
            </div>
          </div>
        ))}
      </div>
      <Action
        onClick={() => {
          setInvited(true);
        }}
        disabled={invited}
      >
        {invited ? "Invitation ready" : "Invite teammate"}
      </Action>
      {invited && (
        <p role="status" className="grass-note">
          <DocumentText>Demo invitation prepared. No email sent.</DocumentText>
        </p>
      )}
    </Panel>
  );
}

function Tasks() {
  const [done, setDone] = React.useState([true, true, false, false]);

  const tasks = [
    "Define the design tokens",
    "Build the component library",
    "Polish the onboarding flow",
    "Ship something memorable",
  ];

  return (
    <Panel title="One step closer to shipped." tag="LAUNCH CHECKLIST">
      <div className="grass-task-list">
        {tasks.map((task, i) => (
          <div className="grass-task" key={task}>
            <Checkbox
              scale={2}
              id={`home-task-${i}`}
              checked={done[i]}
              onCheckedChange={(v) => {
                setDone((old) => old.map((x, j) => (j === i ? v === true : x)));
              }}
            />
            <label
              htmlFor={`home-task-${i}`}
              className={done[i] ? "grass-done" : ""}
            >
              <DocumentText>{task}</DocumentText>
            </label>
          </div>
        ))}
      </div>
      <div className="grass-panel-foot">
        <output aria-label="Launch progress">
          <DocumentText>
            {done.filter(Boolean).length} of 4 complete
          </DocumentText>
        </output>
        <Link href="/docs/components/checkbox">
          <DocumentText>Checkbox</DocumentText>
        </Link>
      </div>
    </Panel>
  );
}

function Revenue() {
  return (
    <Panel title="Your work, paying off." tag="THIS MONTH">
      <div className="grass-stat-line">
        <strong>
          <DocumentText>$8,420.00</DocumentText>
        </strong>
      </div>
      <p className="grass-positive">
        <DocumentText>+$1,284.50 from last month</DocumentText>
      </p>
      <dl className="grass-ledger">
        <div>
          <dt>
            <DocumentText>Subscriptions</DocumentText>
          </dt>
          <dd>
            <DocumentText>$6,240.00</DocumentText>
          </dd>
        </div>
        <div>
          <dt>
            <DocumentText>One-time sales</DocumentText>
          </dt>
          <dd>
            <DocumentText>$2,460.00</DocumentText>
          </dd>
        </div>
        <div>
          <dt>
            <DocumentText>Refunds & fees</DocumentText>
          </dt>
          <dd>
            <DocumentText>−$280.00</DocumentText>
          </dd>
        </div>
        <div>
          <dt>
            <DocumentText>Net revenue</DocumentText>
          </dt>
          <dd>
            <DocumentText>$8,420.00</DocumentText>
          </dd>
        </div>
      </dl>
      <div className="grass-panel-foot">
        <span>
          <DocumentText>USD</DocumentText>
        </span>
        <Link href="/docs/components/table">
          <DocumentText>View tables</DocumentText>
        </Link>
      </div>
    </Panel>
  );
}

function Preferences() {
  const [email, setEmail] = React.useState(true);
  const [release, setRelease] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  return (
    <Panel title="Keep the good stuff coming." tag="NOTIFICATIONS">
      <div className="grass-preference">
        <div>
          <label htmlFor="home-email">
            <DocumentText>Project updates</DocumentText>
          </label>
          <p>
            <DocumentText>Milestones, mentions and messages.</DocumentText>
          </p>
        </div>
        <Switch
          id="home-email"
          aria-label="Project updates"
          scale={2}
          checked={email}
          onCheckedChange={(v) => {
            setEmail(v);
            setSaved(false);
          }}
          style={{ width: 64 }}
        />
      </div>
      <div className="grass-preference">
        <div>
          <label htmlFor="home-release">
            <DocumentText>Product news</DocumentText>
          </label>
          <p>
            <DocumentText>Fresh features, once in a while.</DocumentText>
          </p>
        </div>
        <Switch
          id="home-release"
          aria-label="Product news"
          scale={2}
          checked={release}
          onCheckedChange={(v) => {
            setRelease(v);
            setSaved(false);
          }}
          style={{ width: 64 }}
        />
      </div>
      <Action
        onClick={() => {
          setSaved(true);
        }}
      >
        Save preferences
      </Action>
      <output
        aria-live="polite"
        aria-label="Preferences status"
        className="grass-note"
      >
        <DocumentText>
          {saved
            ? "Preferences saved for this demo."
            : "Make yourself at home."}
        </DocumentText>
      </output>
    </Panel>
  );
}

function Chat() {
  const [draft, setDraft] = React.useState("");

  const [messages, setMessages] = React.useState([
    { author: "Alex", text: "The new dashboard looks great!" },
    { author: "Jordan", text: "Those pixel charts are so good." },
  ]);

  const list = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = list.current;

    if (el) { el.scrollTop = el.scrollHeight; }
  }, [messages]);

  return (
    <Panel
      title="A little more human."
      description="#design · 3 teammates"
      tag="TEAM CHAT"
    >
      <div
        className="grass-chat-log"
        ref={list}
        role="log"
        aria-label="Team conversation"
      >
        <MessageGroup>
          {messages.map((message, i) => (
            <Message scale={2} author={message.author} key={i}>
              <MessageContent>{message.text}</MessageContent>
            </Message>
          ))}
        </MessageGroup>
      </div>
      <form
        className="grass-chat-compose"
        onSubmit={(e) => {
          e.preventDefault();

          if (draft.trim()) {
            setMessages((old) => [
              ...old,
              { author: "You", text: draft.trim() },
            ]);
            setDraft("");
          }
        }}
      >
        <Input
          scale={2}
          aria-label="Team message"
          placeholder="Say something nice..."
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
        />
        <Action type="submit" disabled={!draft.trim()}>
          Send
        </Action>
      </form>
      <p className="grass-note">
        <DocumentText>Keep the conversation going.</DocumentText>
      </p>
    </Panel>
  );
}

function Performance() {
  const [sample, setSample] = React.useState(0);

  const data = React.useMemo(
    () =>
      Array.from(
        { length: 180 },
        (_, i) =>
          [42, 64, 53, 88, 69, 57, 82, 103, 71, 49, 60, 76][(i + sample) % 12]
      ),
    [sample]
  );

  const container = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(140);
  React.useLayoutEffect(() => {
    const el = container.current!;

    const measure = () => {
      setWidth(Math.max(40, Math.min(242, Math.floor(el.clientWidth))));
    };

    measure();
    const o = new ResizeObserver(measure);
    o.observe(el);

    return () => o.disconnect();
  }, []);

  return (
    <Panel
      title="Old-school pixels. Live insights."
      description="API response time · last 180 requests"
      tag="VANILLA F3, REIMAGINED"
    >
      <div className="grass-native-chart" ref={container}>
        <FpsChartExample
          aria-label="API response time example"
          data={data.map((value) => ({ value }))}
          dataKey="value"
          domain={[0, 150]}
          formatValue={(v) => `${Math.round(v)} ms`}
          guides={[
            { value: 150, label: "150 ms" },
            { value: 75, label: "75 ms" },
          ]}
          width={width}
          scale={1}
        />
      </div>
      <div className="grass-panel-foot">
        <span className="grass-positive">
          <DocumentText>All systems operational</DocumentText>
        </span>
        <button
          className="grass-text-link"
          onClick={() => {
            setSample((v) => v + 1);
          }}
        >
          <DocumentText>Refresh sample</DocumentText>
        </button>
      </div>
    </Panel>
  );
}

function Payout() {
  const [amount, setAmount] = React.useState(250);
  const [saved, setSaved] = React.useState(false);

  return (
    <Panel
      title="Set your own pace."
      description="Choose when your earnings are paid out."
      tag="PAYOUT SETTINGS"
    >
      <div className="grass-between">
        <label htmlFor="home-threshold">
          <DocumentText>Minimum balance</DocumentText>
        </label>
        <strong>
          <DocumentText>${amount.toLocaleString("en-US")}</DocumentText>
        </strong>
      </div>
      <Slider
        id="home-threshold"
        scale={2}
        aria-label="Payout threshold"
        min={50}
        max={1000}
        step={25}
        value={[amount]}
        label={`$${amount}`}
        onValueChange={(v) => {
          setAmount(typeof v === "number" ? v : v[0]);
          setSaved(false);
        }}
      />
      <div className="grass-between grass-note">
        <span>
          <DocumentText>$50 min</DocumentText>
        </span>
        <span>
          <DocumentText>$1,000 max</DocumentText>
        </span>
      </div>
      <Action
        onClick={() => {
          setSaved(true);
        }}
      >
        Save threshold
      </Action>
      <output
        className="grass-note"
        aria-live="polite"
        aria-label="Payout status"
      >
        <DocumentText>
          {saved ? `Threshold set to $${amount}.` : "Your balance. Your call."}
        </DocumentText>
      </output>
    </Panel>
  );
}

function Install() {
  const [item, setItem] = React.useState("button");

  return (
    <section
      className="grass-install"
      id="install"
      aria-labelledby="install-title"
    >
      <Image src={grass} width={48} height={48} alt="Grass block" unoptimized />
      <span className="grass-kicker">
        <DocumentText>COPY. CUSTOMIZE. BUILD.</DocumentText>
      </span>
      <h2 id="install-title">
        <DocumentText>Place your first component.</DocumentText>
      </h2>
      <div className="grass-install-picker">
        <Select
          items={{
            button: "button",
            card: "card",
            chart: "chart",
            combobox: "combobox",
            input: "input",
          }}
          scale={2}
          value={item}
          onValueChange={(value) => {
            setItem(value ?? "button");
          }}
        >
          <SelectTrigger aria-label="Component to install">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["button", "input", "card", "chart", "combobox"].map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <InstallationCommand name={item} />
      <p className="grass-note">
        <DocumentText>Add to a project initialized with shadcn.</DocumentText>
      </p>
    </section>
  );
}

// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Base UI's polymorphic Button needs its Next Link adapter to retain native link semantics.
const installationLink = <Link href="/#install" role="link" />;

// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Base UI's polymorphic Button needs its Next Link adapter to retain native link semantics.
const documentationLink = <Link href="/docs" role="link" />;

export default function HomePageShowcase() {
  return (
    <div className="grass-home" id="home">
      <Link className="grass-skip" href="/#examples">
        <DocumentText>Skip to examples</DocumentText>
      </Link>
      <main id="content">
        <section className="grass-hero" aria-labelledby="grass-title">
          <Link href="/#install" className="grass-announcement">
            <DocumentText>grasscn </DocumentText>
            <span>
              <DocumentText>0.2</DocumentText>
            </span>
          </Link>
          <TitleScene />
          <p className="grass-title-tagline">
            <DocumentText>Pixel-perfect Minecraft UI.</DocumentText>
          </p>
          <p>
            <DocumentText>shadcn components. Yours to build.</DocumentText>
          </p>
          <div className="grass-hero-actions">
            <Button nativeButton={false} render={installationLink} scale={2}>
              {"Get started"}
            </Button>
            <Button nativeButton={false} render={documentationLink} scale={2}>
              {"Browse components"}
            </Button>
          </div>
        </section>
        <section
          className="grass-examples"
          id="examples"
          aria-label="Interactive application examples"
        >
          <div className="grass-examples-heading">
            <span>
              <DocumentText>BUILT WITH GRASSCN</DocumentText>
            </span>
            <span>
              <DocumentText>Interactive examples</DocumentText>
            </span>
          </div>
          <div className="grass-showcase-grid">
            <div className="grass-showcase-column">
              <Controls />
              <Tasks />
              <Performance />
              <Feedback />
            </div>
            <div className="grass-showcase-column">
              <Analytics />
              <Revenue />
              <Savings />
            </div>
            <div className="grass-showcase-column">
              <Project />
              <Payout />
              <Schedule />
            </div>
            <div className="grass-showcase-column">
              <Team />
              <Chat />
              <Preferences />
              <Plan />
            </div>
          </div>
        </section>
        <Install />
      </main>
    </div>
  );
}
