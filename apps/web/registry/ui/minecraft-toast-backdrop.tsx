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

    const canvas =
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      ref.current as HTMLCanvasElement;

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

      let selectedPortion: number;

      if (state.phase === "hidden") {
        selectedPortion = 0;
      } else if (state.phase === "shown") {
        selectedPortion = 1;
      } else if (state.phase === "exiting") {
        selectedPortion = Math.fround(1 - Math.fround(t * t));
      } else {
        selectedPortion = Math.fround(t * t);
      }

      const portion = selectedPortion;

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
      className="pointer-events-none absolute [inset:0] h-full w-full"
    />
  );
};
