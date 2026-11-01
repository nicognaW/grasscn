import * as React from "react";

import { paintToast } from "./minecraft-toast-gpu";
import { toastLayout } from "./minecraft-toast-layout";

export type ToastMotion = {
  phase: "entering" | "exiting" | "shown" | "hidden";
  start: number;
};

export const MinecraftToastGraphic = ({
  title,
  message,
  scale,
  motion,
  onLayout,
}: {
  title: string;
  message: string | null;
  scale: 1 | 2 | 3;
  motion: React.RefObject<ToastMotion>;
  onLayout?: (width: number, height: number) => void;
}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let signature = "";

    setReady(false);
    const canvas = ref.current!;
    void toastLayout(title, message).then((layout) => {
      if (disposed) {
        return;
      }

      onLayout?.(layout.width, layout.height);

      const paint = () => {
        if (disposed) {
          return;
        }

        const bounds = canvas.getBoundingClientRect();
        const state = motion.current;
        const elapsed = Math.max(0, Math.min(600, Date.now() - state.start));
        const t = Math.fround(elapsed / 600);
        const square = Math.fround(t * t);

        const portion =
          state.phase === "hidden"
            ? 0
            : state.phase === "shown"
              ? 1
              : state.phase === "exiting"
                ? Math.fround(1 - square)
                : square;

        const offset = Math.fround(
          layout.width - Math.fround(layout.width * portion)
        );

        const next = JSON.stringify([
          bounds.x,
          bounds.y,
          innerWidth,
          innerHeight,
          offset,
        ]);

        if (signature !== next) {
          signature = next;

          const painted =
            layout.supported &&
            paintToast(
              canvas,
              bounds,
              layout.width,
              layout.height,
              scale,
              offset,
              layout.title,
              layout.message
            );

          setReady(painted);
        }
      };

      const tick = () => {
        paint();
        frame = requestAnimationFrame(tick);
      };

      tick();
      window.addEventListener("resize", paint);
      window.addEventListener("scroll", paint, true);
      cleanup = () => {
        window.removeEventListener("resize", paint);
        window.removeEventListener("scroll", paint, true);
      };
    });
    let cleanup = () => {};

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [title, message, scale, motion, onLayout]);

  return (
    <canvas
      ref={ref}
      data-mc-toast-ready={ready}
      aria-hidden="true"
      style={{
        height: "100%",
        left: 0,
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        visibility: ready ? "visible" : "hidden",
        width: "100%",
      }}
    />
  );
};
