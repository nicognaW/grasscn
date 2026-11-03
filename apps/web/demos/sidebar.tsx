import type { DemoVariables } from "../demo-variables";
import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarInput,
  SidebarSeparator,
  SidebarInset,
} from "../registry/ui/sidebar";
import { MinecraftDisclosureText } from "../registry/ui/minecraft-disclosure-text";
import { Button } from "../registry/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../registry/ui/card";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const SidebarDemo = ({ scale }: DemoProps) => {
  const stage = useDemoWidth(scale);

  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState("Survival");
  const [action, setAction] = React.useState("Ready");

  const worlds = [
    "Survival",
    "Creative",
    "Adventure",
    "你好，世界",
    "Skyblock",
    "Hardcore",
  ].filter((name) => name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div ref={stage.ref} className="demo-stage" data-stage="sidebar">
        <SidebarProvider
          scale={scale}
          onKeyDownCapture={(event) => {
            if (
              (event.ctrlKey || event.metaKey) &&
              event.key.toLowerCase() === "b"
            ) {
              event.preventDefault();
            }
          }}
          style={
            {
              position: "relative",
              width: "100%",
              flexDirection: stage.width < 300 ? "column" : "row",
              minHeight: 0,
              "--sidebar-width": `${120 * scale}px`,
            } as React.CSSProperties
          }
        >
          <Sidebar
            collapsible="none"
            style={{
              width: stage.width < 300 ? "100%" : 120 * scale,
              flexShrink: 0,
            }}
          >
            <SidebarHeader>
              <SidebarGroupLabel>Grasscn</SidebarGroupLabel>
              <SidebarInput
                aria-label="Find sidebar worlds"
                placeholder="Search worlds..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
              />
            </SidebarHeader>
            <SidebarSeparator />
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Worlds</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {worlds.map((name, index) => (
                      <SidebarMenuItem key={name}>
                        <SidebarMenuButton
                          isActive={selected === name}
                          onClick={() => {
                            setSelected(name);
                          }}
                        >
                          {name}
                        </SidebarMenuButton>
                        {index === 0 ? (
                          <SidebarMenuBadge>{worlds.length}</SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setSelected("Settings");
                        }}
                      >
                        Settings
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            href="#sidebar"
                            onClick={() => {
                              setSelected("Game options");
                            }}
                          >
                            Game options
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      setSelected("Main menu");
                    }}
                  >
                    Main menu
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset role="group" aria-label="World workspace">
            <div
              className="p-(--demo-padding) flex flex-col gap-(--demo-gap) min-w-0"
              style={
                /* SAFETY: satisfies checks --demo-padding, --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
                {
                  "--demo-padding": `${8 * scale}px`,
                  "--demo-gap": `${8 * scale}px`,
                } satisfies DemoVariables as DemoVariables
              }
            >
              <div
                className="flex items-center gap-(--demo-gap)"
                style={
                  /* SAFETY: satisfies checks --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
                  {
                    "--demo-gap": `${6 * scale}px`,
                  } satisfies DemoVariables as DemoVariables
                }
              >
                <MinecraftDisclosureText
                  scale={scale}
                  maxWidth={Math.max(1, Math.min(140, stage.width - 42))}
                >
                  Choose a world.
                </MinecraftDisclosureText>
              </div>
              <Card
                scale={scale}
                style={{ gap: 8 * scale, minWidth: 0, padding: 10 * scale }}
              >
                <CardHeader>
                  <CardTitle>{selected}</CardTitle>
                  <CardDescription>Local world</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    scale={scale}
                    className="w-full"
                    onClick={() => {
                      setAction("Play requested: " + selected);
                    }}
                  >
                    Play world
                  </Button>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Sidebar selection">{selected}</output>
        <output aria-label="Sidebar action">{action}</output>
      </div>
    </>
  );
};

export { SidebarDemo as default };
