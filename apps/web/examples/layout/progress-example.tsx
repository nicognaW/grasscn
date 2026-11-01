"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const ProgressExample = () => {
  const [value, setValue] = useState(50);

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 24 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <Progress aria-label="World loading" value={value} />
      <Button
        onClick={() => {
          setValue(value === 100 ? 0 : 100);
        }}
      >
        {value === 100 ? "Restart" : "Complete"}
      </Button>
    </div>
  );
};

export default ProgressExample;
