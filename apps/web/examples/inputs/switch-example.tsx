"use client";

import { useId, useState } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const SwitchExample = () => {
  const id = useId();
  const [checked, setChecked] = useState(false);

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ alignItems: "center", display: "flex", gap: 12 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <Switch id={id} checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor={id}>Enable clouds</Label>
    </div>
  );
};

export default SwitchExample;
