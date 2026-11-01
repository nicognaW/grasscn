"use client";

import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ToggleGroupExample = () => {
  const [stations, setStations] = useState<string[]>(["crafting"]);

  return (
    <ToggleGroup
      aria-label="Crafting station"
      multiple={false}
      value={stations}
      onValueChange={setStations}
    >
      <ToggleGroupItem value="crafting" aria-label="Crafting table" />
      <ToggleGroupItem value="furnace" aria-label="Furnace" />
    </ToggleGroup>
  );
};

export default ToggleGroupExample;
