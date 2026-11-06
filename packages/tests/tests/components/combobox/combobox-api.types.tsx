import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
  ComboboxClear,
  ComboboxChipRemove,
} from "@grasscn/web/ui/combobox";
import { Input } from "@grasscn/web/ui/input";
import * as React from "react";

interface World {
  id: string;
  name: string;
}

const worlds: World[] = [{ id: "a", name: "世界" }];

export const SingleApi = () => {
  const input = React.useRef<HTMLInputElement>(null);
  const list = React.useRef<HTMLDivElement>(null);

  return (
    <Combobox
      items={worlds}
      defaultValue={worlds[0]}
      itemToStringLabel={(item) => item.name}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(a, b) => a.id === b.id}
      onValueChange={(value, details) => {
        if (value?.id === "blocked") {
          details.cancel();
        }
      }}
      scale={3}
      name="world"
    >
      <ComboboxInput
        ref={input}
        showClear
        showTrigger
        className={(state) => (state.open ? "open" : "")}
        render={(props, state) => (
          <Input {...props} data-open-state={state.open} />
        )}
      />
      <ComboboxTrigger
        render={(props, state) => (
          <button type="button" {...props} data-state={state.open} />
        )}
      />
      <ComboboxContent
        side="top"
        align="end"
        sideOffset={2}
        alignOffset={1}
        style={(state) => ({ opacity: state.open ? 1 : 0 })}
      >
        <ComboboxGroup>
          <ComboboxLabel>Worlds</ComboboxLabel>
          <ComboboxList ref={list}>
            <ComboboxCollection>
              {(item: World, index: number) => (
                <ComboboxItem
                  key={item.id}
                  value={item}
                  index={index}
                  className={(state) => (state.selected ? "selected" : "")}
                >
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxGroup>
        <ComboboxSeparator />
        <ComboboxEmpty>Empty</ComboboxEmpty>
      </ComboboxContent>
      <ComboboxValue placeholder="Choose" />
      <ComboboxClear />
    </Combobox>
  );
};

export const MultipleApi = () => {
  const anchor = useComboboxAnchor();
  const chipsInput = React.useRef<HTMLInputElement>(null);

  return (
    <Combobox<string, true>
      multiple
      items={["Stone", "世界"]}
      defaultValue={["Stone"]}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(values: string[]) =>
            values.map((value) => (
              <ComboboxChip key={value} showRemove={false}>
                {value}
                <ComboboxChipRemove aria-label={`Remove ${value}`} />
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput ref={chipsInput} />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem value={item} key={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
