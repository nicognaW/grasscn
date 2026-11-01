import Link from "next/link";

import { chartExamples } from "../../examples/charts/catalog";
import { Button } from "../../registry/ui/button";
import { Card } from "../../registry/ui/card";
import { ComponentExample } from "../component-example";
import { DocumentText } from "../document-text";
import { InstallationCommand } from "../installation-command";

import "./showcase.css";

export const chartTypes = [
  ["overview", "Overview"],
  ["metric", "F3 metrics"],
  ["profiler", "F3 breakdown"],
  ["fps", "F3 frame time"],
  ["bar", "Bar"],
  ["stacked-bar", "Stacked bar"],
  ["line", "Line"],
  ["area", "Area"],
  ["pie", "Pie"],
  ["donut", "Donut"],
  ["radar", "Radar"],
  ["radial", "Radial"],
] as const;

function Example({ name }: { name: keyof typeof chartExamples }) {
  const example = chartExamples[name];
  return (
    <Card
      scale={2}
      className="chart-example"
      role="region"
      aria-label={example.title}
    >
      <h2>
        <DocumentText>{example.title}</DocumentText>
      </h2>
      <p>
        <DocumentText>{example.description}</DocumentText>
      </p>
      <ComponentExample
        name={name}
        title={`${example.title} example`}
        tabListWidth={240}
      />
    </Card>
  );
}

export function ChartShowcase({ type = "overview" }: { type?: string }) {
  const selected = chartTypes.find(([key]) => key === type) ?? chartTypes[0];
  const title = selected[0] === "overview" ? "Charts" : `${selected[1]} charts`;
  const names: (keyof typeof chartExamples)[] =
    selected[0] === "overview"
      ? [
          "metric-example",
          "profiler-example",
          "bar-visitors-example",
          "fps-example",
        ]
      : selected[0] === "metric"
        ? ["metric-example", "request-volume-example"]
        : selected[0] === "fps"
          ? ["fps-example"]
          : selected[0] === "profiler"
            ? ["profiler-example"]
            : [
                `${selected[0]}-visitors-example`,
                `${selected[0]}-sources-example`,
              ];
  return (
    <div className="showcase-layout">
      <aside className="showcase-sidebar">
        <nav aria-label="Chart types">
          {chartTypes.map(([key, label]) => (
            <Button
              key={key}
              scale={2}
              nativeButton={false}
              render={
                <Link
                  href={key === "overview" ? "/charts" : `/charts/${key}`}
                  role="link"
                  aria-current={key === selected[0] ? "page" : undefined}
                />
              }
            >
              {label}
            </Button>
          ))}
        </nav>
        <Link href="/docs" className="showcase-index-link">
          <DocumentText>All components</DocumentText>
        </Link>
      </aside>
      <main id="content" className="showcase-main">
        <nav className="showcase-breadcrumb" aria-label="Breadcrumb">
          <Link href="/charts">
            <DocumentText>Charts</DocumentText>
          </Link>
          {selected[0] !== "overview" && (
            <DocumentText> / {selected[1]}</DocumentText>
          )}
        </nav>
        <div className="showcase-intro">
          <h1>
            <DocumentText>{title}</DocumentText>
          </h1>
          <p>
            <DocumentText>
              Make your data feel at home. Explore pixel charts, F3 renderers
              and examples with everyday web data.
            </DocumentText>
          </p>
        </div>
        {selected[0] === "overview" && (
          <div className="chart-type-links">
            {chartTypes.slice(1).map(([key, label]) => (
              <Button
                key={key}
                scale={2}
                nativeButton={false}
                render={<Link href={`/charts/${key}`} role="link" />}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        <div className="charts-examples">
          {names.map((name) => (
            <Example key={name} name={name} />
          ))}
        </div>
        <section className="charts-install">
          <h2>
            <DocumentText>Installation</DocumentText>
          </h2>
          <p>
            <DocumentText>
              Add the chart components to your project.
            </DocumentText>
          </p>
          <InstallationCommand name="chart" />
          <Link href="/docs/components/chart">
            <DocumentText>Chart documentation</DocumentText>
          </Link>
        </section>
      </main>
    </div>
  );
}
