"use client";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
export default function TextareaExample() {
  const [value, setValue] = useState("Line one\nLine two\nLine three");
  return (
    <Textarea
      aria-label="Journey notes"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
