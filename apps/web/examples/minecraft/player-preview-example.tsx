"use client";
import { useState } from "react";

import { PlayerPreview } from "@/components/ui/player-preview";
export default function PlayerPreviewExample() {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PlayerPreview
        skin="wide/steve"
        aria-label="Steve preview"
        onLoadingStatusChange={setStatus}
      />
      <output aria-live="polite">
        {status === "error"
          ? "3D preview unavailable"
          : status === "loaded"
            ? "Skin ready"
            : "Loading skin"}
      </output>
    </div>
  );
}
