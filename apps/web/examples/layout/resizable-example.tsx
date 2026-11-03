"use client";

import { useState, useRef, useId } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";

import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Typography } from "@/components/ui/typography";

const ResizableExample = () => {
  const group = useRef<GroupImperativeHandle>(null);
  const identity = useId();
  const left = `${identity}-left`;
  const right = `${identity}-right`;
  const [layout, setLayout] = useState("50% / 50%");

  return (
    <div className="grid [gap:24px]">
      <ResizablePanelGroup
        orientation="horizontal"
        groupRef={group}
        onLayoutChanged={(value) => {
          setLayout(
            `${Math.round(value[left] ?? 50)}% / ${Math.round(value[right] ?? 50)}%`
          );
        }}
        /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ height: 280, maxWidth: "100%", width: 560 }}
        /* eslint-enable shadcn/no-inline-styles */
      >
        <ResizablePanel id={left} defaultSize="50%" minSize="30%">
          <Typography>Inventory</Typography>
        </ResizablePanel>
        <ResizableHandle withHandle aria-label="Resize inventory panels" />
        <ResizablePanel id={right} defaultSize="50%" minSize="30%">
          <Typography>Recipes</Typography>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Button
        onClick={() => {
          group.current?.setLayout({ [left]: 50, [right]: 50 });
        }}
      >
        Reset panels
      </Button>
      <Typography as="output" aria-label="Panel layout">
        {layout}
      </Typography>
    </div>
  );
};

export default ResizableExample;
