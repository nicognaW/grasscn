"use client";

import type { ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../registry/ui/tabs";

export const InstallationTabs = ({
  cli,
  manual,
}: {
  cli: ReactNode;
  manual: ReactNode;
}) => (
  <Tabs
    defaultValue="cli"
    scale={2}
    /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className="documentation-installation-tabs"
    /* eslint-enable shadcn/no-unknown-classes */
  >
    <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-tabs-scroll"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <TabsList aria-label="Installation method">
        <TabsTrigger value="cli">CLI</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>
    </div>
    <TabsContent value="cli">{cli}</TabsContent>
    <TabsContent value="manual">{manual}</TabsContent>
  </Tabs>
);
