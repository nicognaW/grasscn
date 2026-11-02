"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LabelExample = () => {
  const id = useId();

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 12 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <Label htmlFor={id}>Player name</Label>
      <Input id={id} defaultValue="Steve" />
    </div>
  );
};

export default LabelExample;
