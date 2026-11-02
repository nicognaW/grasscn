"use client";

import { Badge } from "@/components/ui/badge";

const BadgeAchievements = () => (
  <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
    style={{ display: "grid", gap: 24 }}
    /* eslint-enable shadcn/no-inline-styles */
  >
    <Badge achievement="goal" earned={false}>
      Diamonds!
    </Badge>
    <Badge achievement="task" earned>
      Diamonds!
    </Badge>
  </div>
);

export default BadgeAchievements;
