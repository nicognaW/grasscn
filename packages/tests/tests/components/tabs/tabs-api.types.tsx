import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
} from "@grasscn/web/ui/tabs";

// @ts-expect-error Minecraft menu tabs do not have a vertical orientation.
const vertical = <Tabs orientation="vertical" />;

// @ts-expect-error The shadcn line variant has no native menu-tab reference.
const line = <TabsList variant="line" activateOnFocus />;

export const TabsApiContract = function TabsApiContract() {
  const supported = (
    <Tabs defaultValue="game" orientation="horizontal" scale={3}>
      <TabsList variant="default" activateOnFocus>
        <TabsTrigger value="game">Game</TabsTrigger>
      </TabsList>
      <TabsContent value="game">Content</TabsContent>
    </Tabs>
  );

  const styled = tabsListVariants({ variant: "default" });

  return [supported, styled, vertical, line];
};
