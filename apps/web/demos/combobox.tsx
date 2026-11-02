import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import{Combobox,ComboboxInput,ComboboxContent,ComboboxList,ComboboxItem,ComboboxEmpty,ComboboxChips,ComboboxChip,ComboboxChipsInput,ComboboxValue,useComboboxAnchor}from"../registry/ui/combobox"
import{Button}from"../registry/ui/button"
import{MinecraftMenuText,MenuScaleContext}from"../registry/ui/minecraft-menu-text"
import type{DemoProps}from"../types"
const biomes = ["Grasslands", "Birch Forest", "你好，世界", "Deep Dark"],
  blocks = ["Oak Planks", "Stone", "你好，世界", "Bedrock"];
export default function ComboboxDemo({ scale }: DemoProps) {
  const [value, setValue] = React.useState<string | null>(null),
    [inventory, setInventory] = React.useState<string[]>(["Oak Planks"]),
    anchor = useComboboxAnchor();
  return (
    <MenuScaleContext.Provider value={scale}>
      <div className="demo-options">
        <Button
          type="button"
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${100 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setValue(null);
            setInventory(["Oak Planks"]);
          }}
        >
          Reset choices
        </Button>
      </div>
      <div
        className="demo-stage demo-stage-display-flex flex-col"
        data-stage="combobox"
        style={
          /* SAFETY: satisfies checks --demo-stage-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-stage-gap": `${12 * scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <Combobox
          scale={scale}
          items={biomes}
          value={value}
          onValueChange={setValue}
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
        <Combobox
          scale={scale}
          multiple
          items={blocks}
          value={inventory}
          onValueChange={setInventory}
          autoHighlight
        >
          <ComboboxChips ref={anchor} aria-label="Inventory choices">
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
                <ComboboxItem
                  key={item}
                  value={item}
                  disabled={item === "Bedrock"}
                >
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      <div
        className="demo-result"
        style={
          {
            "--mc-scale": 1,
            "--mc-pixel": "1px",
            "--mc-ink": "currentColor",
            "--mc-shadow": "#2a2a2a",
          } as React.CSSProperties
        }
      >
        <span className="status-dot" />
        <output aria-label="Biome choice">
          <MinecraftMenuText>{value ?? "Choose a biome"}</MinecraftMenuText>
        </output>
        <output aria-label="Inventory blocks">
          <MinecraftMenuText>
            {inventory.join(", ") || "Empty inventory"}
          </MinecraftMenuText>
        </output>
      </div>
    </MenuScaleContext.Provider>
  );
}
