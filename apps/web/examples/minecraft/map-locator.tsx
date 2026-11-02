"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LocatorBar } from "@/components/ui/map";

const MapLocator = () => {
  const [heading, setHeading] = useState(0);

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 24 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <LocatorBar
        markers={[{ bearing: 0, id: "camp", label: "Camp" }]}
        heading={heading}
      />
      <Button
        onClick={() => {
          setHeading((value) => (value + 30) % 360);
        }}
      >
        Turn right
      </Button>
      <Button
        onClick={() => {
          setHeading(0);
        }}
      >
        Face north
      </Button>
      <output aria-live="polite">Heading {heading}</output>
    </div>
  );
};

export default MapLocator;
