"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Typography } from "@/components/ui/typography";

const TabsExample = () => {
  const [value, setValue] = useState("game");

  return (
    <Tabs
      value={value}
      onValueChange={setValue}
      /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ minWidth: 304, width: 606 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <TabsList aria-label="World settings" activateOnFocus>
        <TabsTrigger value="game">Game</TabsTrigger>
        <TabsTrigger value="world">World</TabsTrigger>
        <TabsTrigger value="more">More</TabsTrigger>
      </TabsList>
      <TabsContent
        value="game" /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ height: 128, padding: 16 }}
        /* eslint-enable shadcn/no-inline-styles */
      >
        <Typography>World settings</Typography>
      </TabsContent>
      <TabsContent
        value="world" /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ height: 128, padding: 16 }}
        /* eslint-enable shadcn/no-inline-styles */
      >
        <Typography>Generate structures</Typography>
      </TabsContent>
      <TabsContent
        value="more" /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ height: 128, padding: 16 }}
        /* eslint-enable shadcn/no-inline-styles */
      >
        <Button
          onClick={() => {
            setValue("game");
          }}
        >
          Reset settings
        </Button>
      </TabsContent>
    </Tabs>
  );
};

export default TabsExample;
