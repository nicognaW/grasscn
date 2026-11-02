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

const p = new URLSearchParams(location.search);
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const orientation =
  p.get("orientation") === "vertical" ? "vertical" : "horizontal";

export const ResizableFixture = () => {
  React.useLayoutEffect(() => {
    document.body.style.background = p.get("background") ?? "#202020";
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
  }, []);

  const group = React.useRef<GroupImperativeHandle>(null);
  const panel = React.useRef<PanelImperativeHandle>(null);
  const element = React.useRef<HTMLDivElement>(null);
  const handle = React.useRef<HTMLDivElement>(null);
  const [layout, setLayout] = React.useState("");
  const [refs, setRefs] = React.useState("");

  return (
    <>
      <ResizablePanelGroup
        id="group"
        scale={scale}
        groupRef={group}
        elementRef={element}
        orientation={orientation}
        disabled={p.has("groupDisabled")}
        onLayoutChanged={(value) => {
          setLayout(JSON.stringify(value));
        }}
        style={{ height: 256, width: 600 }}
      >
        <ResizablePanel
          id="left"
          defaultSize="50%"
          minSize="10%"
          collapsible
          collapsedSize="0%"
          panelRef={panel}
        >
          <div style={{ background: "#555", height: "100%" }}>First panel</div>
        </ResizablePanel>
        <ResizableHandle
          id="subject"
          aria-label="Resize panels"
          withHandle={!p.has("noHandle")}
          disabled={p.has("disabled")}
          elementRef={handle}
          data-subject="true"
        />
        <ResizablePanel id="right" defaultSize="50%" minSize="10%">
          <div style={{ background: "#333", height: "100%" }}>Second panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <button
        id="set-layout"
        onClick={() => {
          group.current?.setLayout({ left: 25, right: 75 });
        }}
      >
        Set layout
      </button>
      <button id="collapse" onClick={() => panel.current?.collapse()}>
        Collapse
      </button>
      <button id="expand" onClick={() => panel.current?.expand()}>
        Expand
      </button>
      <button id="resize" onClick={() => panel.current?.resize("35%")}>
        Resize panel
      </button>
      <button
        id="read-ref"
        onClick={() => {
          setRefs(
            `${element.current?.tagName}/${handle.current?.tagName}/${Object.keys(
              group.current?.getLayout() ?? {}
            )
              .sort()
              .join(",")}`
          );
        }}
      >
        Read refs
      </button>
      <output id="layout">{layout}</output>
      <output id="refs">{refs}</output>
    </>
  );
};
