"use client";

import { useState } from "react";

import { AdvancementTree } from "@/components/ui/advancement-tree";
import type { AdvancementNode } from "@/components/ui/advancement-tree";

const nodes: AdvancementNode[] = [
  { completed: true, id: "plan", title: "Plan", x: 0, y: 0 },
  { id: "build", parentId: "plan", title: "Build", x: 1, y: 0 },
  { id: "share", kind: "goal", parentId: "build", title: "Share", x: 2, y: 0 },
];

const AdvancementTreeExample = () => {
  const [selected, setSelected] = useState("plan");

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 16 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
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
};

export default AdvancementTreeExample;
