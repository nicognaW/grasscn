import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@grasscn/web/ui/resizable";
import * as React from "react";
import type {
  GroupImperativeHandle,
  PanelImperativeHandle,
} from "react-resizable-panels";

const Types = () => {
  const g = React.useRef<GroupImperativeHandle>(null);
  const p = React.useRef<PanelImperativeHandle>(null);
  const e = React.createRef<HTMLDivElement>();

  return (
    <ResizablePanelGroup
      orientation="vertical"
      scale={3}
      groupRef={g}
      elementRef={e}
      defaultLayout={{ one: 40, two: 60 }}
      onLayoutChanged={(layout, meta) => {
        void layout;
        void meta;
      }}
    >
      <ResizablePanel id="one" defaultSize="40%" minSize={40} panelRef={p} />
      <ResizableHandle withHandle elementRef={e} disabled={false} />
      <ResizablePanel id="two" defaultSize="60%" />
    </ResizablePanelGroup>
  );
};

void Types;
