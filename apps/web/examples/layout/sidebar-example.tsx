"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Typography } from "@/components/ui/typography";

const SidebarExample = () => (
  <SidebarProvider /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
    style={{ minHeight: 260, width: "100%" }}
    /* eslint-enable shadcn/no-inline-styles */
  >
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Worlds</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */}
              <SidebarMenuButton render={<a href="#preview" />} isActive>
                Survival
              </SidebarMenuButton>
              {/* eslint-enable jsx-a11y/control-has-associated-label */}
            </SidebarMenuItem>
            <SidebarMenuItem>
              {/* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */}
              <SidebarMenuButton render={<a href="#usage" />}>
                Creative
              </SidebarMenuButton>
              {/* eslint-enable jsx-a11y/control-has-associated-label */}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    <SidebarInset>
      <Typography>Choose a world</Typography>
    </SidebarInset>
  </SidebarProvider>
);

export default SidebarExample;
