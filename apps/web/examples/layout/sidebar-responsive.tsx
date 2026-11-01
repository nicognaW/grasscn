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

const SidebarResponsive = () => {
  const [open, setOpen] = useState(true);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ minHeight: 260, transform: "translateZ(0)" }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <Sidebar>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */}
              <SidebarMenuButton render={<a href="#usage" />}>
                Worlds
              </SidebarMenuButton>
              {/* eslint-enable jsx-a11y/control-has-associated-label */}
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
};

export default SidebarResponsive;
