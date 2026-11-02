"use client";

import { useState } from "react";

import { Toggle } from "@/components/ui/toggle";

const ToggleExample = () => {
  const [pressed, setPressed] = useState(false);

  return (
    <Toggle
      aria-label="Only craftable recipes"
      pressed={pressed}
      onPressedChange={setPressed}
    />
  );
};

export default ToggleExample;
