"use client";

import type { ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../registry/ui/tabs";
import { CodeView } from "./code-view";

export const ExampleTabs = ({
  children,
  code,
  filename,
  title,
  tabListWidth,
}: {
  children: ReactNode;
  code: string;
  filename: string;
  title: string;
  tabListWidth?: number;
}) => (
  <section /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className="documentation-example"
    /* eslint-enable shadcn/no-unknown-classes */ aria-label={title}
  >
    <Tabs
      defaultValue="preview"
      scale={2}
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-example-tabs"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
        className="documentation-tabs-scroll"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <TabsList
          aria-label={`${title} view`} /* eslint-disable shadcn/no-inline-styles -- Native document rendering retains its declared pixel geometry and dynamic sizing. */
          style={{ width: tabListWidth }}
          /* eslint-enable shadcn/no-inline-styles */
        >
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="preview">
        <div className="minecraft-example">{children}</div>
      </TabsContent>
      <TabsContent value="code">
        <CodeView code={code} filename={filename} />
      </TabsContent>
    </Tabs>
  </section>
);
