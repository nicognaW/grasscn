"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LocatorBar } from "@/components/ui/map";
export default function MapLocator() {
  const [heading, setHeading] = useState(0);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <LocatorBar
        markers={[{ id: "camp", label: "Camp", bearing: 0 }]}
        heading={heading}
      />
      <Button onClick={() => setHeading((value) => (value + 30) % 360)}>
        Turn right
      </Button>
      <Button onClick={() => setHeading(0)}>Face north</Button>
      <output aria-live="polite">Heading {heading}</output>
    </div>
  );
}
