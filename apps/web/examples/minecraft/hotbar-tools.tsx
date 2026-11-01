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
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 16 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
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
