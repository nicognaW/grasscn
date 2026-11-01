"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CheckboxExample = () => {
  const id = useId();
  const [checked, setChecked] = useState(false);

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ alignItems: "center", display: "flex", gap: 12 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <Checkbox id={id} checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor={id}>Enable shadows</Label>
    </div>
  );
};

export default CheckboxExample;
