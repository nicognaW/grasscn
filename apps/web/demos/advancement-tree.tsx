import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import {
  AdvancementTree,
  type AdvancementNode,
} from "../registry/ui/advancement-tree";
import { Button } from "../registry/ui/button";
import type { DemoProps } from "../types";

const milestones: AdvancementNode[] = [
  {
    id: "plan",
    x: 0,
    y: 1,
    title: "Plan",
    description: "Define the product and its audience.",
    completed: true,
  },
  {
    id: "design",
    parentId: "plan",
    x: 2,
    y: 0,
    title: "Design",
    description: "Create the first working prototype.",
    kind: "goal",
    completed: true,
  },
  {
    id: "build",
    parentId: "plan",
    x: 2,
    y: 2,
    title: "Build",
    description: "Implement and test the core features.",
    kind: "task",
  },
  {
    id: "launch",
    parentId: "design",
    x: 4,
    y: 1,
    title: "Launch",
    description: "Ship the release to your users.",
    kind: "challenge",
  },
];

const AdvancementDemo = ({ scale }: DemoProps) => {
  const [nodes, setNodes] = React.useState(milestones);
  const [selected, setSelected] = React.useState("plan");
  const [reset, setReset] = React.useState(0);

  const node = nodes.find((n) => n.id === selected)!;

  return (
    <>
      <div
        className="demo-stage demo-stage-display-grid demo-stage-gap-16"
        data-stage="advancement-tree"
      >
        <AdvancementTree
          key={reset}
          nodes={nodes}
          scale={scale}
          selectedId={selected}
          onSelectedIdChange={setSelected}
          aria-label="Release roadmap"
        />
        <strong>{node.title}</strong>
        <p>{node.description}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            scale={scale}
            onClick={() => {
              setNodes((old) =>
                old.map((n) =>
                  n.id === selected ? { ...n, completed: !n.completed } : n
                )
              );
            }}
            className="w-(--demo-width) max-w-full"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${200 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
          >
            {node.completed ? "Mark incomplete" : "Complete milestone"}
          </Button>
          <Button
            scale={scale}
            onClick={() => {
              setReset((v) => v + 1);
            }}
            className="w-(--demo-width) max-w-full"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${100 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
          >
            Reset view
          </Button>
        </div>
        <p className="grass-note">
          Drag to pan. Use Tab to reach milestones and arrow keys to explore.
        </p>
      </div>
    </>
  );
};

export { AdvancementDemo as default };
