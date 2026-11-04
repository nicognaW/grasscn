import { Button } from "@grasscn/web/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
  CommandSeparator,
  CommandShortcut,
  CommandDialog,
} from "@grasscn/web/ui/command";
import * as React from "react";

import type { FixtureLabels } from "./fixture-query-protocol";
import { cn } from "./utils";

const p = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const native = p.has("native");
const part = p.get("part") ?? "list";

// SAFETY: the owned native case callers serialize their actual string-label arrays, or this unchanged literal default; retain the original URL read and JSON parse.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned menu-label JSON producer boundary; all reads and existing filters remain unchanged.
const labels = JSON.parse(
  p.get("labels") ?? '["Stone","Stick","世界"]'
) as FixtureLabels;

export const CommandFixture = () => {
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.background = p.get("background") ?? "#202020";
  }, []);

  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);

  const [selected, setSelected] = React.useState(
    Number(p.get("selectedIndex") ?? -1) >= 0
      ? `row-${p.get("selectedIndex")}`
      : ""
  );

  const [search, setSearch] = React.useState(p.get("text") ?? "");
  const [output, setOutput] = React.useState("");
  const [open, setOpen] = React.useState(p.has("open"));

  const commandFixtureWidth = `${Number(p.get("width") ?? 200) * scale}px`;
  const commandFixtureX = `${Number(p.get("x") ?? 16) * scale}px`;
  const commandFixtureY = `${Number(p.get("y") ?? 16) * scale}px`;

  const commandNativeDimensions: Pick<
    React.CSSProperties,
    "height" | "maxHeight"
  > = {};

  if (part === "list" && native) {
    commandNativeDimensions.height = Number(p.get("height") ?? 36) * scale;
    commandNativeDimensions.maxHeight = Number(p.get("height") ?? 36) * scale;
  }

  const position: React.CSSProperties = {
    "--fixture-width": commandFixtureWidth,

    "--fixture-x": commandFixtureX,

    "--fixture-y": commandFixtureY,
    ...commandNativeDimensions,
  };

  const nativeInput = native && part === "input";

  const inputControl = (
    <CommandInput
      id={native && part === "input" ? "subject" : undefined}
      ref={input}
      aria-label="Search commands"
      placeholder={p.get("placeholder") ?? "Search commands..."}
      value={search}
      onValueChange={setSearch}
      disabled={p.get("state")?.startsWith("disabled")}
      readOnly={p.get("state")?.includes("readonly")}
      maxLength={p.has("maxLength") ? Number(p.get("maxLength")) : undefined}
      className={cn({
        "fixture-geometry-x fixture-placement-absolute fixture-geometry-y fixture-geometry-width":
          nativeInput,
      })}
      style={nativeInput ? position : undefined}
      data-subject={
        (native && part === "input" ? "subject" : undefined) === "subject"
          ? "true"
          : undefined
      }
    />
  );

  const entries = p.has("implicit") ? (
    <>
      <CommandGroup heading="Tools" forceMount={p.has("force")}>
        <CommandItem onSelect={setOutput}>
          <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
            <path d="M0 4h8M4 0v8" stroke="currentColor" />
          </svg>
          <strong>Calendar</strong>
        </CommandItem>
        <CommandItem onSelect={setOutput}>
          <span>Search docs</span>
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="World">
        <CommandItem value="settings" onSelect={setOutput}>
          Settings
        </CommandItem>
      </CommandGroup>
      <CommandEmpty>No commands found.</CommandEmpty>
    </>
  ) : (
    <>
      <CommandGroup heading="Building blocks">
        <CommandItem value="stone" keywords={["rock"]} onSelect={setOutput}>
          Stone<CommandShortcut>Ctrl S</CommandShortcut>
        </CommandItem>
        <CommandItem value="stick" onSelect={setOutput}>
          Stick
        </CommandItem>
        <CommandItem value="world" keywords={["世界"]} onSelect={setOutput}>
          世界
        </CommandItem>
        <CommandItem disabled value="bedrock" onSelect={setOutput}>
          Bedrock
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="World">
        <CommandItem value="settings" onSelect={setOutput}>
          Settings
        </CommandItem>
      </CommandGroup>
      <CommandEmpty>No commands found.</CommandEmpty>
    </>
  );

  const content = (
    <>
      {inputControl}
      <CommandList label="Available commands">{entries}</CommandList>
    </>
  );

  if (native) {
    return (
      <Command
        ref={root}
        scale={scale}
        shouldFilter={false}
        value={selected}
        onValueChange={(next) => {
          if (root.current?.contains(document.activeElement) ?? false) {
            setSelected(next);
          }
        }}
      >
        {part === "input" ? (
          inputControl
        ) : (
          <CommandList
            id="subject"
            tabIndex={-1}
            label="Native command rows"
            surface={p.get("surface") === "popup" ? "popup" : "suggestions"}
            className="fixture-geometry-x fixture-placement-absolute fixture-geometry-y fixture-geometry-width"
            style={position}
            data-subject="true"
          >
            {labels.map((label, i) => (
              <CommandItem key={i} value={`row-${i}`}>
                {label}
              </CommandItem>
            ))}
          </CommandList>
        )}
      </Command>
    );
  }

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open commands
      </Button>
      {p.has("dialog") ? (
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          scale={scale}
          title="World commands"
          description="Find a command"
        >
          {content}
        </CommandDialog>
      ) : (
        <Command ref={root} scale={scale} label="Search commands" loop>
          {content}
        </Command>
      )}
      <output aria-label="Selected command">{output}</output>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setOutput(input.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
    </>
  );
};
