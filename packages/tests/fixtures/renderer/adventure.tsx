import { AdvancementTree } from "@grasscn/web/ui/advancement-tree";
import * as React from "react";
import { createRoot } from "react-dom/client";

const DraftDemos = React.lazy(async () => import("./draft-demos"));

const params = new URLSearchParams(location.search);
const scale = Number(params.get("scale") ?? 2) as 1 | 2 | 3;
const mask = Number(params.get("mask") ?? 1);
const x = Number(params.get("x") ?? 40);
const y = Number(params.get("y") ?? 16);

const positions = [
  [0, 1],
  [2, 0],
  [2, 2],
  [4, 1],
];

const nodes: React.ComponentProps<typeof AdvancementTree>["nodes"] =
  positions.map(([x, y], i) => ({
    completed: !!(mask & (1 << i)),
    id: String(i),
    kind: i === 0 ? "task" : i === 1 ? "goal" : "challenge",
    parentId: i ? String(i === 3 ? 1 : 0) : undefined,
    title: `Milestone ${i}`,
    x,
    y,
  }));

const sample = params.has("case")
  ? JSON.parse(params.get("case")!)
  : {
      element: params.get("kind") ?? "advancement-tree",
      state: params.get("state") ?? undefined,
      value: params.has("value") ? Number(params.get("value")) : undefined,
    };

if (sample.background) {
  document.body.style.backgroundColor = sample.background;
}

if (
  sample.element === "sign" ||
  sample.element === "hanging-sign" ||
  sample.element === "map"
) {
  Object.assign(document.querySelector<HTMLElement>("#root")!.style, {
    left: `${(sample.x ?? 0) * scale}px`,
    position: "absolute",
    top: `${(sample.y ?? 0) * scale}px`,
  });
}

createRoot(document.querySelector<HTMLElement>("#root")!).render(
  sample.element === "advancement-tree" ? (
    <AdvancementTree
      id="subject"
      nodes={nodes}
      scale={scale}
      defaultPan={{ x, y }}
      onSelectedIdChange={(id) =>
        (document.documentElement.dataset.selected = id)
      }
      data-subject="true"
    />
  ) : (
    <React.Suspense fallback={<span>Loading preview...</span>}>
      <DraftDemos sample={sample} scale={scale} />
    </React.Suspense>
  )
);
