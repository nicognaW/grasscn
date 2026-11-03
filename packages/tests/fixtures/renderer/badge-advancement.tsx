import { Badge } from "@grasscn/web/ui/badge";
import * as React from "react";

const p = new URLSearchParams(location.search);
// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;

export const BadgeAdvancementFixture = () => {
  return (
    <Badge
      id="subject"
      scale={scale}
      achievement={
        (p.get("achievement") ?? "challenge") as "challenge" | "goal" | "task"
      }
      earned={p.get("earned") !== "false"}
      className="fixture-geometry-x fixture-placement-absolute fixture-geometry-y fixture-geometry-width"
      style={{
        "--fixture-width": `${117 * scale}px`,

        "--fixture-x": `${24 * scale}px`,

        "--fixture-y": `${16 * scale}px`,
      }}
      data-subject="true"
    >
      {p.get("label") ?? "Diamonds!"}
    </Badge>
  );
};
