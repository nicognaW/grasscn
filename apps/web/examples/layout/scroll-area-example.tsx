"use client";

import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Typography } from "@/components/ui/typography";

const ScrollAreaExample = () => {
  const viewport = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("Select a row");

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 16 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <Button onClick={() => viewport.current?.scrollTo({ top: 0 })}>
        Top
      </Button>
      <ScrollArea
        /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
        role="region"
        /* eslint-enable jsx-a11y/prefer-tag-over-role */

        aria-label="World list"
        viewportRef={viewport}
        viewportProps={{ "aria-label": "Scrollable rows" }}
        /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ height: 128, maxWidth: "100%", width: 400 }}
        /* eslint-enable shadcn/no-inline-styles */
      >
        <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
          style={{ height: 4800 }}
          /* eslint-enable shadcn/no-inline-styles */
        >
          {Array.from({ length: 100 }, (_, index) => (
            <div
              key={
                index
              } /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
              style={{ height: 48 }}
              /* eslint-enable shadcn/no-inline-styles */
            >
              <Button
                /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
                style={{ width: "100%" }}
                /* eslint-enable shadcn/no-inline-styles */
                onClick={() => {
                  setSelected(`Selected Row ${index + 1}`);
                }}
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
};

export default ScrollAreaExample;
