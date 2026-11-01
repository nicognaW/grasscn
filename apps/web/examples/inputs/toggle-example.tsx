"use client";
import { useState } from "react";

import { Toggle } from "@/components/ui/toggle";
export default function ToggleExample() {
  const [pressed, setPressed] = useState(false);
  return (
    <Toggle
      aria-label="Only craftable recipes"
      pressed={pressed}
      onPressedChange={setPressed}
    />
  );
}
