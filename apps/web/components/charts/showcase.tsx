import Link from "next/link";

import { chartExamples } from "../../examples/charts/catalog";
import { Button } from "../../registry/ui/button";
import { Card } from "../../registry/ui/card";
import { ComponentExample } from "../component-example";
import { DocumentText } from "../document-text";
import { InstallationCommand } from "../installation-command";

import "./showcase.css";

/* eslint-disable react-doctor/only-export-components -- Server documentation metadata and the shared MDX text adapter are intentional exports of this rendering owner. */
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
/* eslint-enable react-doctor/only-export-components */

const Example = ({ name }: { name: keyof typeof chartExamples }) => {
  const example = chartExamples[name];

  return (
    <Card
      scale={2}
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
      className="chart-example"
      /* eslint-enable shadcn/no-unknown-classes */

      /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
      role="region"
      /* eslint-enable jsx-a11y/prefer-tag-over-role */

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
};

export const ChartShowcase = ({ type = "overview" }: { type?: string }) => {
  const selected = chartTypes.find(([key]) => key === type) ?? chartTypes[0];
  const title = selected[0] === "overview" ? "Charts" : `${selected[1]} charts`;

  let names: (keyof typeof chartExamples)[];

  switch (selected[0]) {
    case "overview": {
      names = [
        "metric-example",
        "profiler-example",
        "bar-visitors-example",
        "fps-example",
      ];
      break;
    }

    case "metric": {
      names = ["metric-example", "request-volume-example"];
      break;
    }

    case "fps": {
      names = ["fps-example"];
      break;
    }

    case "profiler": {
      names = ["profiler-example"];
      break;
    }

    case "area":
    case "bar":
    case "donut":
    case "line":
    case "pie":
    case "radar":
    case "radial":
    case "stacked-bar": {
      names = [
        `${selected[0]}-visitors-example`,
        `${selected[0]}-sources-example`,
      ];
    }
    // All selected families come from the enumerated chartTypes metadata.
    // no default
  }

  return (
    <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
      className="showcase-layout"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <aside /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
        className="showcase-sidebar"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <nav aria-label="Chart types">
          {chartTypes.map(([key, label]) => (
            <Button
              key={key}
              scale={2}
              nativeButton={false}
              render={
                <Link
                  href={key === "overview" ? "/charts" : `/charts/${key}`}

                  /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
                  role="link"
                  /* eslint-enable jsx-a11y/prefer-tag-over-role */

                  aria-current={key === selected[0] ? "page" : undefined}
                />
              }
            >
              {label}
            </Button>
          ))}
        </nav>
        <Link
          href="/docs" /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
          className="showcase-index-link"
          /* eslint-enable shadcn/no-unknown-classes */
        >
          <DocumentText>All components</DocumentText>
        </Link>
      </aside>
      <main
        id="content" /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
        className="showcase-main"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <nav /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
          className="showcase-breadcrumb"
          /* eslint-enable shadcn/no-unknown-classes */ aria-label="Breadcrumb"
        >
          <Link href="/charts">
            <DocumentText>Charts</DocumentText>
          </Link>
          {selected[0] !== "overview" && (
            <DocumentText> / {selected[1]}</DocumentText>
          )}
        </nav>
        <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
          className="showcase-intro"
          /* eslint-enable shadcn/no-unknown-classes */
        >
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
          <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
            className="chart-type-links"
            /* eslint-enable shadcn/no-unknown-classes */
          >
            {chartTypes.slice(1).map(([key, label]) => (
              <Button
                key={key}
                scale={2}
                nativeButton={false}
                render={
                  <Link
                    href={`/charts/${key}`}
                    /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
                    role="link"
                    /* eslint-enable jsx-a11y/prefer-tag-over-role */
                  />
                }
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
          className="charts-examples"
          /* eslint-enable shadcn/no-unknown-classes */
        >
          {names.map((name) => (
            <Example key={name} name={name} />
          ))}
        </div>
        <section /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/charts/showcase.css and loaded by the documentation layout. */
          className="charts-install"
          /* eslint-enable shadcn/no-unknown-classes */
        >
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
};
