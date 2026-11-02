import { AdvancementTree } from "@grasscn/web/ui/advancement-tree";
import * as React from "react";
import { createRoot } from "react-dom/client";

import type { AdventureFixtureSample } from "./fixture-query-protocol";

const DraftDemos = React.lazy(async () => import("./draft-demos"));

const params = new URLSearchParams(location.search);

// SAFETY: owned Adventure callers serialize GUI scales 1/2/3; the existing omitted-scale default is 2.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Adventure fixture GUI-scale query boundary.
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
  positions.map(([nodeX, nodeY], i) => ({
    // oxlint-disable-next-line no-bitwise -- Each bit of this fixture mask selects one completed node, preserving signed 32-bit mask semantics.
    completed: !!(mask & (1 << i)),
    id: String(i),
    kind: i === 0 ? "task" : i === 1 ? "goal" : "challenge",
    parentId: i ? String(i === 3 ? 1 : 0) : undefined,
    title: `Milestone ${i}`,
    x: nodeX,
    y: nodeY,
  }));

// SAFETY: owned Adventure callers serialize DraftDemos samples and optional native positions into this query.
// oxlint-disable typescript/no-unsafe-type-assertion -- Exact Adventure fixture query producer boundary.
const sample: AdventureFixtureSample = params.has("case")
  ? (JSON.parse(params.get("case")!) as AdventureFixtureSample)
  : {
      element: params.get("kind") ?? "advancement-tree",
      state: params.get("state") ?? undefined,
      value: params.has("value") ? Number(params.get("value")) : undefined,
    };
// oxlint-enable typescript/no-unsafe-type-assertion

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
      onSelectedIdChange={(id) => {
        document.documentElement.dataset.selected = id;
      }}
      data-subject="true"
    />
  ) : (
    <React.Suspense fallback={<span>Loading preview...</span>}>
      <DraftDemos sample={sample} scale={scale} />
    </React.Suspense>
  )
);
