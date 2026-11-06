"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../registry/ui/tabs";
import { CodeView } from "./code-view";
import { DocumentText } from "./document-text";

const subscribeToHydration = () => () => {
  // Hydration readiness has no external updates after the initial client commit.
};

const clientReady = () => true;
const serverReady = () => false;

export const ExampleTabs = ({
  children,
  code,
  filename,
  title,
  tabListLayout = "responsive",
  installation,
}: {
  children: ReactNode;
  code: string;
  filename: string;
  title: string;
  tabListLayout?: "responsive" | "compact";
  installation: ReactNode;
}) => {
  const ready = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady
  );

  return (
    <section /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-example"
      /* eslint-enable shadcn/no-unknown-classes */ aria-label={title}
      aria-busy={!ready}
    >
      <Tabs
        defaultValue="preview"
        scale={2}
        inert={!ready}
        aria-disabled={ready ? undefined : true}
        /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
        className="documentation-example-tabs"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
          className="documentation-tabs-scroll"
          /* eslint-enable shadcn/no-unknown-classes */
        >
          <TabsList
            aria-label={`${title} view`}
            data-example-tabs-layout={tabListLayout}
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
      {!ready && (
        <output
          /* eslint-disable shadcn/no-unknown-classes -- Defined in the imported documentation.css. */
          className="documentation-example-loading"
          /* eslint-enable shadcn/no-unknown-classes */
        >
          <DocumentText>Loading example...</DocumentText>
        </output>
      )}
      {installation}
    </section>
  );
};
