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

const HotbarTools = () => {
  const [value, setValue] = useState(0);

  return (
    <div className="grid [gap:16px]">
      <Hotbar
        items={labels.map((label) => ({ id: label, label }))}
        value={value}
        onValueChange={setValue}
        background="#202020"
      />
      <output aria-live="polite">{labels[value]}</output>
    </div>
  );
};

export default HotbarTools;
