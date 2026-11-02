import * as React from "react";

import { paintToast } from "./minecraft-toast-gpu";
import type { ToastMotion } from "./minecraft-toast-graphic";

export const MinecraftToastBackdrop = ({
  scale,
  motion,
}: {
  scale: 1 | 2 | 3;
  motion: React.RefObject<ToastMotion>;
}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let signature = "";

    const canvas = ref.current!;

    const paint = () => {
      if (disposed) {
        return;
      }

      const b = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(b.width / scale));
      const height = Math.max(1, Math.round(b.height / scale));
      const state = motion.current;

      const t = Math.fround(
        Math.max(0, Math.min(600, Date.now() - state.start)) / 600
      );

      const portion =
        state.phase === "hidden"
          ? 0
          : state.phase === "shown"
            ? 1
            : state.phase === "exiting"
              ? Math.fround(1 - Math.fround(t * t))
              : Math.fround(t * t);

      const offset = Math.fround(width - Math.fround(width * portion));

      const next = JSON.stringify([
        b.x,
        b.y,
        width,
        height,
        innerWidth,
        innerHeight,
        offset,
      ]);

      if (next !== signature) {
        signature = next;
        paintToast(canvas, b, width, height, scale, offset, [], []);
      }
    };

    const tick = () => {
      paint();
      frame = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("resize", paint);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", paint);
    };
  }, [scale, motion]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
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
