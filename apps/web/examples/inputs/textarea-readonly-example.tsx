"use client";
import { Textarea } from "@/components/ui/textarea";
export default function VariantExample() {
  return (
    <Textarea
      aria-label="Read-only notes"
      defaultValue={"Line one\nLine two\nLine three"}
      readOnly
    />
  );
}
