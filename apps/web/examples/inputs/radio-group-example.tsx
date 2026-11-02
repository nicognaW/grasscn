"use client";

import { useId, useState } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const RadioGroupExample = () => {
  const id = useId();
  const [mode, setMode] = useState("survival");

  return (
    <RadioGroup aria-label="World mode" value={mode} onValueChange={setMode}>
      {["survival", "creative"].map((value) => (
        <div
          key={value}
          /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
          style={{ alignItems: "center", display: "flex", gap: 12 }}
          /* eslint-enable shadcn/no-inline-styles */
        >
          <RadioGroupItem id={`${id}-${value}`} value={value} />
          <Label htmlFor={`${id}-${value}`}>
            {value === "survival" ? "Survival" : "Creative"}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};

export default RadioGroupExample;
