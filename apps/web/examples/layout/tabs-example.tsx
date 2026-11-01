"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Typography } from "@/components/ui/typography";

export default function TabsExample() {
  const [value, setValue] = useState("game");
  return (
    <Tabs
      value={value}
      onValueChange={setValue}
      style={{ width: 606, minWidth: 304 }}
    >
      <TabsList aria-label="World settings" activateOnFocus>
        <TabsTrigger value="game">Game</TabsTrigger>
        <TabsTrigger value="world">World</TabsTrigger>
        <TabsTrigger value="more">More</TabsTrigger>
      </TabsList>
      <TabsContent value="game" style={{ padding: 16, height: 128 }}>
        <Typography>World settings</Typography>
      </TabsContent>
      <TabsContent value="world" style={{ padding: 16, height: 128 }}>
        <Typography>Generate structures</Typography>
      </TabsContent>
      <TabsContent value="more" style={{ padding: 16, height: 128 }}>
        <Button onClick={() => setValue("game")}>Reset settings</Button>
      </TabsContent>
    </Tabs>
  );
}
