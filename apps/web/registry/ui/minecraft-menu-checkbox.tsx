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
    const canvas =
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      ref.current as HTMLCanvasElement;

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

      let _selectedName:
        | "checkbox_selected_highlighted"
        | "checkbox_selected"
        | "checkbox_highlighted"
        | "checkbox";

      if (checked) {
        _selectedName = highlighted
          ? "checkbox_selected_highlighted"
          : "checkbox_selected";
      } else if (highlighted) {
        _selectedName = "checkbox_highlighted";
      } else {
        _selectedName = "checkbox";
      }

      const name = _selectedName;

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
        const canvasSide = 17 * scale;
        canvas.height = canvasSide;
        canvas.width = canvasSide;

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
      className="pointer-events-none absolute [inset:0] h-full w-full"
    />
  );
};
