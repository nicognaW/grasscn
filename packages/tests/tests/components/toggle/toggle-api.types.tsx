import { Toggle, toggleVariants } from "@grasscn/web/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@grasscn/web/ui/toggle-group";
import * as React from "react";

const itemRef = React.createRef<HTMLButtonElement>();
const groupRef = React.createRef<HTMLDivElement>();

const toggle = (
  <Toggle
    render={<button type="button" />}
    ref={itemRef}
    scale={3}
    pressed
    onPressedChange={(value) => {
      value satisfies boolean;
    }}
  >
    {"Crafting \u4E16\u754C"}
  </Toggle>
);

const single = (
  <ToggleGroup
    ref={groupRef}
    value={["a"]}
    onValueChange={(value) => {
      value satisfies readonly string[];
    }}
    dir="rtl"
    orientation="vertical"
    multiple={false}
  >
    <ToggleGroupItem ref={itemRef} value="a" aria-label="Crafting" />
  </ToggleGroup>
);

const multiple = (
  <ToggleGroup
    defaultValue={["a"]}
    onValueChange={(value) => {
      value satisfies readonly string[];
    }}
    spacing={4}
    multiple
  >
    <ToggleGroupItem value="a" />
  </ToggleGroup>
);

// @ts-expect-error The original recipe filter has no outline variant.
const outline = <Toggle variant="outline" />;

// @ts-expect-error The original recipe filter has no small visual size.
const small = <ToggleGroup size="sm" multiple={false} />;

toggleVariants({ className: "custom", size: "default", variant: "default" });

void [toggle, single, multiple, outline, small];
