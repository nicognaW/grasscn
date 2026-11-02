"use client";

import { useState } from "react";

import { PlayerPreview } from "@/components/ui/player-preview";

const PlayerPreviewExample = () => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 16 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
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
