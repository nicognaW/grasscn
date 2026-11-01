"use client";

import { useState } from "react";

import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const modes = [
  { label: "Survival", value: "survival" },
  { label: "Creative", value: "creative" },
  { label: "Adventure", value: "adventure" },
];

const SelectExample = () => {
  const [mode, setMode] = useState<string | null>("survival");

  return (
    <Select items={modes} value={mode} onValueChange={setMode}>
      <SelectTrigger aria-label="Game mode">
        <SelectValue placeholder="Choose game mode" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} sideOffset={4}>
        {modes.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SelectExample;
