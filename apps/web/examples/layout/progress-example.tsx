"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ProgressExample() {
  const [value, setValue] = useState(50);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Progress aria-label="World loading" value={value} />
      <Button onClick={() => setValue(value === 100 ? 0 : 100)}>
        {value === 100 ? "Restart" : "Complete"}
      </Button>
    </div>
  );
}
