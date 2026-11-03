"use client";

import { useState } from "react";

import { PlayerPreview } from "@/components/ui/player-preview";

const PlayerPreviewExample = () => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  return (
    <div className="grid [gap:16px]">
      <PlayerPreview
        skin="wide/steve"
        aria-label="Steve preview"
        onLoadingStatusChange={setStatus}
      />
      <output aria-live="polite">
        {
          {
            error: "3D preview unavailable",
            loaded: "Skin ready",
            loading: "Loading skin",
          }[status]
        }
      </output>
    </div>
  );
};

export default PlayerPreviewExample;
