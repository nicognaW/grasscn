"use client";
import { Slider } from "@/components/ui/slider";
export default function VariantExample() {
  return (
    <Slider
      aria-label="Locked volume"
      defaultValue={[50]}
      label="Volume: 50%"
      disabled
    />
  );
}
