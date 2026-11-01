"use client";
import { useState } from "react";

import {
  AdvancementTree,
  type AdvancementNode,
} from "@/components/ui/advancement-tree";
const nodes: AdvancementNode[] = [
  { id: "plan", title: "Plan", x: 0, y: 0, completed: true },
  { id: "build", parentId: "plan", title: "Build", x: 1, y: 0 },
  { id: "share", parentId: "build", title: "Share", x: 2, y: 0, kind: "goal" },
];
export default function AdvancementTreeExample() {
  const [selected, setSelected] = useState("plan");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <AdvancementTree
        nodes={nodes}
        selectedId={selected}
        onSelectedIdChange={setSelected}
        aria-label="Release roadmap"
      />
      <output aria-live="polite">
        {nodes.find((node) => node.id === selected)?.title}
      </output>
    </div>
  );
}
