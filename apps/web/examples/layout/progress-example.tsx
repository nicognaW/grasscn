"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const ProgressExample = () => {
  const [value, setValue] = useState(50);

  return (
    <div className="grid [gap:24px]">
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
