"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";

const AspectRatioExample = () => (
  <div className="[width:400px] max-w-full">
    <AspectRatio ratio={16 / 9}>
      <img
        width="160"
        height="90"
        alt="Green square against a dark pixel field"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90'%3E%3Cpath fill='%23202020' d='M0 0h160v90H0z'/%3E%3Cpath fill='%2355aa55' d='M60 25h40v40H60z'/%3E%3C/svg%3E"

        className="[height:100%] [width:100%] [image-rendering:pixelated]"
      />
    </AspectRatio>
  </div>
);

export default AspectRatioExample;
