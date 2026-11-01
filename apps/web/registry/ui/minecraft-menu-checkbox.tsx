import * as React from "react";

import {
  menuCheckboxPixels,
  retainMenuCheckboxPainter,
  releaseMenuCheckboxPainter,
} from "./minecraft-menu-checkbox-gpu";
import { MenuScaleContext } from "./minecraft-menu-text";

export const MinecraftMenuCheckboxSprite = () => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const scale = React.useContext(MenuScaleContext);

  React.useLayoutEffect(() => {
    const canvas = ref.current!;
    const parent = canvas.parentElement!;

    const item =
      parent.closest<HTMLElement>(".mc-menu-checkbox-item") ??
      parent.parentElement!;

    const context = canvas.getContext("2d")!;

    let frame = 0;
    let signature = "";

    retainMenuCheckboxPainter();

    const tick = () => {
      const bounds = parent.getBoundingClientRect();
      const checked = item.hasAttribute("data-checked");
      const highlighted = Object.hasOwn(item.dataset, "highlighted");

      const name = checked
        ? highlighted
          ? "checkbox_selected_highlighted"
          : "checkbox_selected"
        : highlighted
          ? "checkbox_highlighted"
          : "checkbox";

      const next = JSON.stringify([
        name,
        bounds.x,
        bounds.y,
        innerWidth,
        innerHeight,
      ]);

      if (next !== signature) {
        signature = next;
        const pixels = menuCheckboxPixels(name, scale, bounds.x, bounds.y);
        canvas.width = canvas.height = 17 * scale;

        if (pixels) {
          context.putImageData(
            new ImageData(pixels, canvas.width, canvas.height),
            0,
            0
          );
        }

        canvas.dataset.mcMenuSpriteReady = String(Boolean(pixels));
      }

      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frame);
      releaseMenuCheckboxPainter();
    };
  }, [scale]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-mc-menu-sprite-ready="false"
      style={{
        height: "100%",
        inset: 0,
        pointerEvents: "none",
        position: "absolute",
        width: "100%",
      }}
    />
  );
};
