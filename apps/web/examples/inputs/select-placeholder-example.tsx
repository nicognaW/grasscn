"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const VariantExample = () => (
  <Select
    items={[
      { label: "Survival", value: "survival" },
      { label: "Creative", value: "creative" },
    ]}
  >
    <SelectTrigger aria-label="Choose world mode">
      <SelectValue placeholder="Choose game mode" />
    </SelectTrigger>
    <SelectContent alignItemWithTrigger={false} sideOffset={4}>
      <SelectItem value="survival">Survival</SelectItem>
      <SelectItem value="creative" disabled>
        Creative
      </SelectItem>
    </SelectContent>
  </Select>
);

export default VariantExample;
