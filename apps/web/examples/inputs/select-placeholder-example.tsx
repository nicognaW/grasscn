"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
export default function VariantExample() {
  return (
    <Select
      items={[
        { value: "survival", label: "Survival" },
        { value: "creative", label: "Creative" },
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
}
