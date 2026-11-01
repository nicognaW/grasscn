"use client";
import { useState } from "react";

import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "@/components/ui/native-select";
export default function NativeSelectExample() {
  const [mode, setMode] = useState("survival");
  return (
    <NativeSelect
      aria-label="Native world mode"
      value={mode}
      onChange={(event) => setMode(event.target.value)}
    >
      <NativeSelectOptGroup label="World mode">
        <NativeSelectOption value="survival">Survival</NativeSelectOption>
        <NativeSelectOption value="creative">Creative</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  );
}
