"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LabelExample = () => {
  const id = useId();

  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>Player name</Label>
      <Input id={id} defaultValue="Steve" />
    </div>
  );
};

export default LabelExample;
