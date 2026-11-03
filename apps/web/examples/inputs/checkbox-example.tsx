"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CheckboxExample = () => {
  const id = useId();
  const [checked, setChecked] = useState(false);

  return (
    <div className="items-center flex [gap:12px]">
      <Checkbox id={id} checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor={id}>Enable shadows</Label>
    </div>
  );
};

export default CheckboxExample;
