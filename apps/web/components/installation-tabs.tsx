"use client";
import type { ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../registry/ui/tabs";

export function InstallationTabs({
  cli,
  manual,
}: {
  cli: ReactNode;
  manual: ReactNode;
}) {
  return (
    <Tabs
      defaultValue="cli"
      scale={2}
      className="documentation-installation-tabs"
    >
      <div className="documentation-tabs-scroll">
        <TabsList aria-label="Installation method">
          <TabsTrigger value="cli">CLI</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="cli">{cli}</TabsContent>
      <TabsContent value="manual">{manual}</TabsContent>
    </Tabs>
  );
}
