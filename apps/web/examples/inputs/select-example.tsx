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
  { value: "survival", label: "Survival" },
  { value: "creative", label: "Creative" },
  { value: "adventure", label: "Adventure" },
];
export default function SelectExample() {
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
}
