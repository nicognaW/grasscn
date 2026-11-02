"use client";

import { Kbd, KbdGroup } from "@/components/ui/kbd";

const KbdExample = () => (
  <KbdGroup aria-label="Control plus B">
    <Kbd>Ctrl</Kbd>
    <Kbd>B</Kbd>
  </KbdGroup>
);

export default KbdExample;
