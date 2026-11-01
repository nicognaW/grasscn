"use client";

import { Slider } from "@/components/ui/slider";

const VariantExample = () => (
  <Slider
    aria-label="Locked volume"
    defaultValue={[50]}
    label="Volume: 50%"
    disabled
  />
);

export default VariantExample;
