"use client";

import { Separator } from "@/components/ui/separator";

export default function SeparatorExample() {
  return (
    <div style={{ width: 400, maxWidth: "100%", display: "grid", gap: 32 }}>
      <Separator role="separator" aria-label="Menu header separator" />
      <Separator
        edge="footer"
        role="separator"
        aria-label="Menu footer separator"
      />
    </div>
  );
}
