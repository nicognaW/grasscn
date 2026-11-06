import {
  Marker,
  MarkerContent,
  MarkerIcon,
  markerVariants,
} from "@grasscn/web/ui/marker";
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "@grasscn/web/ui/native-select";
import * as React from "react";

const selectRef = React.createRef<HTMLSelectElement>();

<NativeSelect
  ref={selectRef}
  name="world"
  required
  form="settings"
  value="one"
  onChange={(event) => {
    const select: HTMLSelectElement = event.currentTarget;
    select.value.toUpperCase();
  }}
>
  <NativeSelectOptGroup label="Worlds">
    <NativeSelectOption value="one">世界</NativeSelectOption>
  </NativeSelectOptGroup>
</NativeSelect>;

<NativeSelect multiple defaultValue={["one"]} />;

<Marker
  render={
    // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- Marker supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
    <a href="#world" />
  }
  variant="separator"
>
  <>
    <MarkerIcon>!</MarkerIcon>
    <MarkerContent>World</MarkerContent>
  </>
</Marker>;

markerVariants({ variant: "border" });

// @ts-expect-error The original CycleButton has no small visual variant.
<NativeSelect size="sm" />;
