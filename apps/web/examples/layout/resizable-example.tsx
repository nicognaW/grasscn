"use client";

import { useState, useRef } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";

import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Typography } from "@/components/ui/typography";

export default function ResizableExample() {
  const group = useRef<GroupImperativeHandle>(null);
  const [layout, setLayout] = useState("50% / 50%");
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <ResizablePanelGroup
        orientation="horizontal"
        groupRef={group}
        onLayoutChanged={(value) =>
          setLayout(
            `${Math.round(value.left ?? 50)}% / ${Math.round(value.right ?? 50)}%`
          )
        }
        style={{ width: 560, maxWidth: "100%", height: 280 }}
      >
        <ResizablePanel id="left" defaultSize="50%" minSize="30%">
          <Typography>Inventory</Typography>
        </ResizablePanel>
        <ResizableHandle withHandle aria-label="Resize inventory panels" />
        <ResizablePanel id="right" defaultSize="50%" minSize="30%">
          <Typography>Recipes</Typography>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Button onClick={() => group.current?.setLayout({ left: 50, right: 50 })}>
        Reset panels
      </Button>
      <Typography as="output" aria-label="Panel layout">
        {layout}
      </Typography>
    </div>
  );
}
