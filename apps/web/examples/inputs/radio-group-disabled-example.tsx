"use client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
export default function VariantExample() {
  return (
    <RadioGroup aria-label="Locked world mode" defaultValue="survival" disabled>
      <RadioGroupItem value="survival" aria-label="Survival" />
      <RadioGroupItem value="creative" aria-label="Creative" />
    </RadioGroup>
  );
}
