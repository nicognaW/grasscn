"use client";

import { Textarea } from "@/components/ui/textarea";

const VariantExample = () => (
  <Textarea
    aria-label="Read-only notes"
    defaultValue={"Line one\nLine two\nLine three"}
    readOnly
  />
);

export default VariantExample;
