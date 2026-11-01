"use client";

import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const MultipleToggleGroupExample = () => {
  const [stations, setStations] = useState<string[]>([]);

  return (
    <ToggleGroup
      aria-label="Available stations"
      multiple
      value={stations}
      onValueChange={setStations}
    >
      <ToggleGroupItem value="crafting" aria-label="Available crafting table" />
      <ToggleGroupItem value="furnace" aria-label="Available furnace" />
    </ToggleGroup>
  );
};

export default MultipleToggleGroupExample;
