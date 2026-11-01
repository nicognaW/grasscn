import { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from "../../../apps/web/registry/ui/tabs";
export function TabsApiContract() {
    const supported = <Tabs defaultValue="game" orientation="horizontal" scale={3}><TabsList variant="default" activateOnFocus><TabsTrigger value="game">Game</TabsTrigger></TabsList><TabsContent value="game">Content</TabsContent></Tabs>;
    const styled = tabsListVariants({ variant: "default" });
    // @ts-expect-error Minecraft menu tabs do not have a vertical orientation.
    const vertical = <Tabs orientation="vertical"/>;
    // @ts-expect-error The shadcn line variant has no native menu-tab reference.
    const line = <TabsList variant="line" activateOnFocus/>;
    return [supported, styled, vertical, line];
}
