"use client";
import { useState } from "react";

import { Input } from "@/components/ui/input";
export default function InputExample() {
  const [value, setValue] = useState("Hello Minecraft");
  return (
    <Input
      aria-label="Player name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
