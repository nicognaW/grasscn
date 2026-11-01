"use client";

import { useState } from "react";

import { MinecraftMap } from "@/components/ui/map";

// A caller-owned palette test tile: each entry is one Minecraft palette index.
// This is illustrative data, not generated saved-world terrain or RGBA bytes.
const pixels = Uint8Array.from({ length: 128 * 128 }, (_, index) =>
  index % 128 < 64 ? 5 : 13
);

const MapExample = () => {
  const [selected, setSelected] = useState("Choose a marker");

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 16 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <MinecraftMap
        pixels={pixels}
        markers={[
          { decoration: "frame", id: "camp", label: "Camp", x: 0, y: 0 },
        ]}
        onMarkerSelect={() => {
          setSelected("Camp");
        }}
        aria-label="Palette test map"
      />
      <output aria-live="polite">{selected}</output>
    </div>
  );
};

export default MapExample;
