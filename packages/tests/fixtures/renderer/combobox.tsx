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
  ComboboxValue,
  useComboboxAnchor,
  ComboboxClear,
  ComboboxChipRemove,
} from "@grasscn/web/ui/combobox";
import { Input } from "@grasscn/web/ui/input";
import * as React from "react";

const p = new URLSearchParams(location.search);
const native = p.has("native");
const part = p.get("part") ?? "list";
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const labels = JSON.parse(
  p.get("labels") ?? '["Stone","Stick","世界"]'
) as string[];

const nativeItems = labels.map((label, i) => ({ id: `row-${i}`, label }));
const blocks = ["Stone", "Stick", "世界", "Bedrock"];

export const ComboboxFixture = () => {
  React.useLayoutEffect(() => {
    const bg = p.get("background") ?? "#202020";
    const html = document.documentElement.style.background;
    const body = document.body.style.background;

    document.documentElement.style.background = bg;
    document.body.style.background = bg;

    return () => {
      document.documentElement.style.background = html;
      document.body.style.background = body;
    };
  }, []);

  const [value, setValue] = React.useState<string | null>(
    p.has("initial") ? "Stone" : null
  );

  const [multiple, setMultiple] = React.useState<string[]>(["Stone"]);
  const [search, setSearch] = React.useState("");
  const [attempt, setAttempt] = React.useState("");
  const [refTag, setRefTag] = React.useState("");
  const input = React.useRef<HTMLInputElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const anchor = useComboboxAnchor();

  const pos = {
    left: Number(p.get("x") ?? 16) * scale,
    position: "fixed" as const,
    top: Number(p.get("y") ?? 16) * scale,
    width: Number(p.get("width") ?? 200) * scale,
    ...(part === "list"
      ? {
          height: Number(p.get("height") ?? 36) * scale,
          maxHeight: Number(p.get("height") ?? 36) * scale,
        }
      : {}),
  };

  if (native) {
    return part === "input" ? (
      <Combobox
        scale={scale}
        inputValue={p.get("text") ?? ""}
        disabled={p.get("state")?.startsWith("disabled")}
        readOnly={p.get("state")?.includes("readonly")}
      >
        <ComboboxInput
          id="subject"
          ref={input}
          aria-label="Native search"
          showTrigger={false}
          showClear={false}
          placeholder={p.get("placeholder") ?? ""}
          maxLength={
            p.has("maxLength") ? Number(p.get("maxLength")) : undefined
          }
          style={pos}
          data-subject="true"
        />
      </Combobox>
    ) : (
      <Combobox
        scale={scale}
        items={nativeItems}
        defaultOpen
        defaultValue={nativeItems[Number(p.get("selectedIndex") ?? -1)] ?? null}
        inputValue=""
        filter={() => true}
        itemToStringLabel={(item) => item.label}
      >
        <ComboboxInput
          showTrigger={false}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            opacity: 0,
          }}
        />
        <ComboboxList
          id="subject"
          ref={list}
          tabIndex={-1}
          aria-label="Native options"
          surface={p.get("surface") === "popup" ? "popup" : "suggestions"}
          style={pos}
          data-subject="true"
        >
          {nativeItems.map((item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </Combobox>
    );
  }

  if (p.has("multiple")) {
    return (
      <Combobox
        scale={scale}
        multiple
        items={blocks}
        value={multiple}
        onValueChange={setMultiple}
        autoHighlight
      >
        <ComboboxChips ref={anchor} aria-label="Selected blocks">
          <ComboboxValue>
            {(values: string[]) =>
              values.map((item) => (
                <ComboboxChip key={item} showRemove={!p.has("manualRemove")}>
                  {item}
                  {p.has("manualRemove") && (
                    <ComboboxChipRemove aria-label={`Remove ${item}`} />
                  )}
                </ComboboxChip>
              ))
            }
          </ComboboxValue>
          <ComboboxChipsInput ref={input} aria-label="Find blocks" />
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
        <output id="value">{multiple.join(",")}</output>
      </Combobox>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setAttempt(String(new FormData(e.currentTarget).get("block")));
      }}
    >
      <Combobox
        scale={scale}
        items={blocks}
        name="block"
        value={value}
        onValueChange={(next, details) => {
          setAttempt(next ?? "none");

          if (p.has("reject")) {
            details.cancel();
          } else {
            setValue(next);
          }
        }}
        inputValue={search}
        onInputValueChange={setSearch}
        autoHighlight
        disabled={p.has("disabled")}
        readOnly={p.has("readOnly")}
        onOpenChange={(open, details) => {
          if (p.has("rejectOpen")) {
            details.cancel();
          }
        }}
      >
        <ComboboxInput
          ref={input}
          aria-label="Find blocks"
          showClear
          showTrigger={!p.has("noTrigger")}
          className={(state) => (state.open ? "custom-open" : "custom-closed")}
          render={
            p.has("customRender")
              ? (props, state) => (
                  <Input
                    {...props}
                    data-custom={state.open ? "open" : "closed"}
                  />
                )
              : undefined
          }
        />
        <ComboboxContent>
          <ComboboxEmpty>No blocks found.</ComboboxEmpty>
          {p.has("grouped") ? (
            <>
              <ComboboxGroup>
                <ComboboxLabel>Building blocks</ComboboxLabel>
                <ComboboxList>
                  <ComboboxCollection>
                    {(item: string) => (
                      <ComboboxItem
                        key={item}
                        value={item}
                        disabled={item === "Bedrock"}
                      >
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxGroup>
              <ComboboxSeparator />
            </>
          ) : (
            <ComboboxList ref={list}>
              {(item: string) => (
                <ComboboxItem
                  key={item}
                  value={item}
                  disabled={item === "Bedrock"}
                  className={(state) =>
                    state.highlighted ? "custom-highlighted" : ""
                  }
                  render={
                    p.has("customRender")
                      ? (props, state) => (
                          <div
                            {...props}
                            data-rendered={
                              state.selected ? "selected" : "plain"
                            }
                          />
                        )
                      : undefined
                  }
                >
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          )}
        </ComboboxContent>
        <ComboboxValue placeholder="Choose a block">
          {(item: string | null) => item ?? "Choose a block"}
        </ComboboxValue>
        <ComboboxClear id="explicit-clear" aria-label="Clear choice" />
      </Combobox>
      <output id="value">{value ?? "none"}</output>
      <output id="attempt">{attempt}</output>
      <button
        id="ref"
        type="button"
        onClick={() => {
          setRefTag(`${input.current?.tagName}/${list.current?.tagName}`);
        }}
      >
        Read refs
      </button>
      <output id="refs">{refTag}</output>
      <button id="submit" type="submit">
        Submit
      </button>
    </form>
  );
};
