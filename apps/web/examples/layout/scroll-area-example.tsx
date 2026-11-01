"use client";

import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Typography } from "@/components/ui/typography";

export default function ScrollAreaExample() {
  const viewport = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("Select a row");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Button onClick={() => viewport.current?.scrollTo({ top: 0 })}>
        Top
      </Button>
      <ScrollArea
        role="region"
        aria-label="World list"
        viewportRef={viewport}
        viewportProps={{ "aria-label": "Scrollable rows" }}
        style={{ width: 400, maxWidth: "100%", height: 128 }}
      >
        <div style={{ height: 4800 }}>
          {Array.from({ length: 100 }, (_, index) => (
            <div key={index} style={{ height: 48 }}>
              <Button
                style={{ width: "100%" }}
                onClick={() => setSelected(`Selected Row ${index + 1}`)}
              >{`Row ${index + 1}`}</Button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <Typography as="output" aria-live="polite">
        {selected}
      </Typography>
    </div>
  );
}
