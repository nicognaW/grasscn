"use client";
import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function LabelExample() {
  const id = useId();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Label htmlFor={id}>Player name</Label>
      <Input id={id} defaultValue="Steve" />
    </div>
  );
}
