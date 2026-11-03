"use client";

import { Badge } from "@/components/ui/badge";

const BadgeAchievements = () => (
  <div className="grid gap-6">
    <Badge achievement="goal" earned={false}>
      Diamonds!
    </Badge>
    <Badge achievement="task" earned>
      Diamonds!
    </Badge>
  </div>
);

export default BadgeAchievements;
