"use client";

import { Empty } from "@/components/ui/empty";

export default function EmptyExample() {
  return (
    <Empty style={{ width: 400, maxWidth: "100%", height: 82 }}>
      No worlds found
    </Empty>
  );
}
