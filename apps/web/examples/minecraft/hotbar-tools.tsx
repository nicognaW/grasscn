"use client";
import { useState } from "react";

import { Hotbar } from "@/components/ui/hotbar";
const labels = [
  "Draw",
  "Select",
  "Move",
  "Measure",
  "Connect",
  "Comment",
  "Inspect",
  "Preview",
  "Publish",
];
export default function HotbarTools() {
  const [value, setValue] = useState(0);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Hotbar
        items={labels.map((label) => ({ id: label, label }))}
        value={value}
        onValueChange={setValue}
        background="#202020"
      />
      <output aria-live="polite">{labels[value]}</output>
    </div>
  );
}
