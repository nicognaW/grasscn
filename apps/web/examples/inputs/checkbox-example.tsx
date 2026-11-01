"use client";
import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
export default function CheckboxExample() {
  const id = useId();
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Checkbox id={id} checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor={id}>Enable shadows</Label>
    </div>
  );
}
