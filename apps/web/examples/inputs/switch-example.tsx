"use client";
import { useId, useState } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
export default function SwitchExample() {
  const id = useId();
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Switch id={id} checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor={id}>Enable clouds</Label>
    </div>
  );
}
