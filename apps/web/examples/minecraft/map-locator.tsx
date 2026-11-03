"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LocatorBar } from "@/components/ui/map";

const MapLocator = () => {
  const [heading, setHeading] = useState(0);

  return (
    <div className="grid [gap:24px]">
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
