"use client";

import type { ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../registry/ui/tabs";
import { CodeView } from "./code-view";

export function ExampleTabs({
  children,
  code,
  filename,
  title,
}: {
  children: ReactNode;
  code: string;
  filename: string;
  title: string;
}) {
  return (
    <section className="documentation-example" aria-label={title}>
      <Tabs
        defaultValue="preview"
        scale={2}
        className="documentation-example-tabs"
      >
        <div className="documentation-tabs-scroll">
          <TabsList aria-label={`${title} view`}>
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
}
