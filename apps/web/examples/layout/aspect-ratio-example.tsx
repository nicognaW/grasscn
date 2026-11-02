"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";

const AspectRatioExample = () => (
  <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
    style={{ maxWidth: "100%", width: 400 }}
    /* eslint-enable shadcn/no-inline-styles */
  >
    <AspectRatio ratio={16 / 9}>
      
      <img
        width="160"
        height="90"
        alt="Green square against a dark pixel field"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90'%3E%3Cpath fill='%23202020' d='M0 0h160v90H0z'/%3E%3Cpath fill='%2355aa55' d='M60 25h40v40H60z'/%3E%3C/svg%3E"
        /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ height: "100%", imageRendering: "pixelated", width: "100%" }}
        /* eslint-enable shadcn/no-inline-styles */
      />
      
    </AspectRatio>
  </div>
);

export default AspectRatioExample;
