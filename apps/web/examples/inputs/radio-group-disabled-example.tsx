"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const VariantExample = () => (
  <RadioGroup aria-label="Locked world mode" defaultValue="survival" disabled>
    <RadioGroupItem value="survival" aria-label="Survival" />
    <RadioGroupItem value="creative" aria-label="Creative" />
  </RadioGroup>
);

export default VariantExample;
