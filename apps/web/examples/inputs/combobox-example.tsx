"use client";

import { useState } from "react";

import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

const biomes = ["Grasslands", "Birch Forest", "Deep Dark"];

const ComboboxExample = () => {
  const [biome, setBiome] = useState<string | null>(null);

  return (
    <Combobox
      items={biomes}
      value={biome}
      onValueChange={setBiome}
      autoHighlight
    >
      <ComboboxInput
        aria-label="Choose a biome"
        placeholder="Search biomes"
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No biomes found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default ComboboxExample;
