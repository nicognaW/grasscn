"use client";

import { Badge } from "@/components/ui/badge";

export default function BadgeAchievements() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Badge achievement="goal" earned={false}>
        Diamonds!
      </Badge>
      <Badge achievement="task" earned>
        Diamonds!
      </Badge>
    </div>
  );
}
