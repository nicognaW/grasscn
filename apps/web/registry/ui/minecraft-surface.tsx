import * as React from "react";
import "./minecraft-surface.css";
type Sprite = {
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
};
function MinecraftSurface({ sprite }: {
    sprite: Sprite;
}) {
    const widths = [sprite.border.left, sprite.width - sprite.border.left - sprite.border.right, sprite.border.right];
    const heights = [sprite.border.top, sprite.height - sprite.border.top - sprite.border.bottom, sprite.border.bottom];
    return <span aria-hidden="true" className="mc-surface" style={{
            gridTemplateColumns: `calc(${widths[0]} * var(--mc-pixel)) minmax(0, 1fr) calc(${widths[2]} * var(--mc-pixel))`,
            gridTemplateRows: `calc(${heights[0]} * var(--mc-pixel)) minmax(0, 1fr) calc(${heights[2]} * var(--mc-pixel))`,
        } as React.CSSProperties}>
    {sprite.pieces.map((piece, index) => <span key={index} style={{ backgroundImage: piece,
                backgroundSize: sprite.stretch && (index % 3 === 1 || Math.floor(index / 3) === 1) ? "100% 100%" : `calc(${widths[index % 3]} * var(--mc-pixel)) calc(${heights[Math.floor(index / 3)]} * var(--mc-pixel))`,
            }}/>)}
  </span>;
}
export { MinecraftSurface };
