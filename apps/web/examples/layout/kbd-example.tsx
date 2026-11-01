"use client";

import { Kbd, KbdGroup } from "@/components/ui/kbd";

export default function KbdExample() {
  return (
    <KbdGroup aria-label="Control plus B">
      <Kbd>Ctrl</Kbd>
      <Kbd>B</Kbd>
    </KbdGroup>
  );
}
