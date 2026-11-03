"use client";

import { useId, useState } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const SwitchExample = () => {
  const id = useId();
  const [checked, setChecked] = useState(false);

  return (
    <div className="items-center flex [gap:12px]">
      <Switch id={id} checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor={id}>Enable clouds</Label>
    </div>
  );
};

export default SwitchExample;
