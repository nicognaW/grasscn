"use client";

import { useState } from "react";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Typography } from "@/components/ui/typography";

export default function SidebarResponsive() {
  const [open, setOpen] = useState(true);
  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      style={{ minHeight: 260, transform: "translateZ(0)" }}
    >
      <Sidebar>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<a href="#usage" />}>
                Worlds
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger aria-label="Toggle world navigation" />
        <Typography>Use the trigger or Control/Command+B.</Typography>
      </SidebarInset>
    </SidebarProvider>
  );
}
