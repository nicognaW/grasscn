"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

const VariantExample = () => (
  <NativeSelect
    aria-label="Locked native world mode"
    defaultValue="survival"
    disabled
  >
    <NativeSelectOption value="survival">Survival</NativeSelectOption>
  </NativeSelect>
);

export default VariantExample;
