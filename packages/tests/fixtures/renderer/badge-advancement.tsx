import { Badge } from "@grasscn/web/ui/badge";
import * as React from "react";
const p = new URLSearchParams(location.search),
  scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
export function BadgeAdvancementFixture() {
  return (
    <Badge
      id="subject"
      scale={scale}
      achievement={
        (p.get("achievement") ?? "challenge") as "challenge" | "goal" | "task"
      }
      earned={p.get("earned") !== "false"}
      style={{
        position: "absolute",
        left: 24 * scale,
        top: 16 * scale,
        width: 117 * scale,
      }}
      data-subject="true"
    >
      {p.get("label") ?? "Diamonds!"}
    </Badge>
  );
}
