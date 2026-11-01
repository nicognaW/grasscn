"use client";

import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";

const blocks = ["Oak Planks", "Stone", "Bedrock"];

const MultipleComboboxExample = () => {
  const [inventory, setInventory] = useState<string[]>(["Oak Planks"]);
  const anchor = useComboboxAnchor();

  return (
    <Combobox
      multiple
      items={blocks}
      value={inventory}
      onValueChange={setInventory}
      autoHighlight
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(selected: string[]) =>
            selected.map((item) => (
              <ComboboxChip key={item}>{item}</ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput
          aria-label="Find inventory blocks"
          placeholder="Add a block"
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No blocks found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item} disabled={item === "Bedrock"}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default MultipleComboboxExample;
