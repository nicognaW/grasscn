import * as React from "react";

import "./minecraft-surface.css";

interface SurfaceStyle extends React.CSSProperties {
  "--mc-surface-columns": string;
  "--mc-surface-rows": string;
}

interface SurfacePieceStyle extends React.CSSProperties {
  "--mc-surface-image": string;
  "--mc-surface-size": string;
}

interface Sprite {
  width: number;
  height: number;
  border: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  stretch: boolean;
  image: string;
  pieces: readonly string[];
}

const MinecraftSurface = ({ sprite }: { sprite: Sprite }) => {
  const widths = [
    sprite.border.left,
    sprite.width - sprite.border.left - sprite.border.right,
    sprite.border.right,
  ];

  const heights = [
    sprite.border.top,
    sprite.height - sprite.border.top - sprite.border.bottom,
    sprite.border.bottom,
  ];

  const surfaceStyle: SurfaceStyle = {
    "--mc-surface-columns": `calc(${widths[0]} * var(--mc-pixel)) minmax(0, 1fr) calc(${widths[2]} * var(--mc-pixel))`,
    "--mc-surface-rows": `calc(${heights[0]} * var(--mc-pixel)) minmax(0, 1fr) calc(${heights[2]} * var(--mc-pixel))`,
  };

  return (
    <span aria-hidden="true" className="mc-surface" style={surfaceStyle}>
      {sprite.pieces.map((piece, index) => {
        const pieceStyle: SurfacePieceStyle = {
          "--mc-surface-image": piece,
          "--mc-surface-size":
            sprite.stretch && (index % 3 === 1 || Math.floor(index / 3) === 1)
              ? "100% 100%"
              : `calc(${widths[index % 3]} * var(--mc-pixel)) calc(${heights[Math.floor(index / 3)]} * var(--mc-pixel))`,
        };

        return <span key={index} style={pieceStyle} />;
      })}
    </span>
  );
};

export { MinecraftSurface };
