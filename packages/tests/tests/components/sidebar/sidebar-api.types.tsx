import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@grasscn/web/ui/sidebar";
import * as React from "react";

const SidebarHook = () => {
  const {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  } = useSidebar();

  const updates = () => {
    setOpen((v) => !v);
    setOpenMobile((v) => !v);
  };

  void updates;
  void state;
  void open;
  void openMobile;
  void isMobile;
  void toggleSidebar;

  return null;
};

interface SidebarFixtureStyle extends React.CSSProperties {
  "--sidebar-width": string;
}

const sidebarStyle: SidebarFixtureStyle = { "--sidebar-width": "300px" };

const SidebarTypes = () => {
  const div = React.useRef<HTMLDivElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);
  const anchor = React.useRef<HTMLAnchorElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const main = React.useRef<HTMLElement>(null);

  return (
    <SidebarProvider
      ref={div}
      scale={3}
      defaultOpen
      open
      onOpenChange={(next) => {
        void next;
      }}
      style={sidebarStyle}
    >
      <Sidebar ref={div} variant="sidebar" side="right" collapsible="icon">
        <SidebarHeader ref={div}>
          <SidebarInput ref={input} readOnly spellCheck={false} />
        </SidebarHeader>
        <SidebarSeparator
          edge="footer"
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This verifies SidebarSeparator's forwarded Separator role API inside the sidebar composition, not a literal hr substitute.
          role="separator"
        />
        <SidebarContent
          ref={div}
          viewportRef={div}
          viewportProps={{
            onScroll: (e) => {
              void e.currentTarget.scrollTop;
            },
          }}
          onScroll={(e) => {
            void e.currentTarget.scrollTop;
          }}
        >
          <SidebarGroup>
            <SidebarGroupLabel render={<span />}>Group</SidebarGroupLabel>
            <SidebarGroupAction
              render={<button type="button" aria-label="Create" />}
              ref={button}
            >
              +
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    ref={button}
                    variant="default"
                    size="default"
                    isActive
                    tooltip={{ children: "Worlds", side: "left" }}
                  >
                    Worlds
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    ref={button}
                    showOnHover
                    aria-label="Actions"
                  >
                    +
                  </SidebarMenuAction>
                  <SidebarMenuBadge align="center" maxWidth={20}>
                    3
                  </SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        ref={anchor}
                        href="#world"
                        isActive
                        size="default"
                      >
                        World
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
        <SidebarRail ref={button} />
      </Sidebar>
      <SidebarInset ref={main}>
        <SidebarTrigger ref={button} />
        <SidebarHook />
      </SidebarInset>
    </SidebarProvider>
  );
};

// @ts-expect-error No vanilla floating visual variant is offered.
const floating = <Sidebar variant="floating" />;

// @ts-expect-error No vanilla outline menu-button visual variant is offered.
const outline = <SidebarMenuButton variant="outline" />;

// @ts-expect-error No small visual menu-button variant is offered.
const small = <SidebarMenuSubButton size="sm" />;

void SidebarTypes;

void floating;

void outline;

void small;
