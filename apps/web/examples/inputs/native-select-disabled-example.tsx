"use client";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
export default function VariantExample() {
  return (
    <NativeSelect
      aria-label="Locked native world mode"
      defaultValue="survival"
      disabled
    >
      <NativeSelectOption value="survival">Survival</NativeSelectOption>
    </NativeSelect>
  );
}
