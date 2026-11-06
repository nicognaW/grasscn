import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import { paintToast } from "./minecraft-toast-gpu";
import { toastLayout } from "./minecraft-toast-layout";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-registry-ui-minecraft-toast-graphic-1-visibility": string;
}

export interface ToastMotion {
  phase: "entering" | "exiting" | "shown" | "hidden";
  start: number;
}

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

  // oxlint-disable-next-line react-doctor/effect-needs-cleanup -- The async painter installs its resize/scroll remover after layout; disposed checks prevent installation after cleanup. Cleanup synchronously marks disposed, cancels the current RAF and invokes that installed remover; recursive ticks stop before reallocating.
  React.useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let signature = "";

    // oxlint-disable-next-line react/set-state-in-effect -- Reset the preceding paint before loading new content; React readiness publication stays coordinated with the existing onLayout height commit.
    setReady(false);

    const canvas =
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      ref.current as HTMLCanvasElement;

    const layoutLoading = toastLayout(title, message);

    let cleanup = () => {
      // No painter resources exist until asynchronous layout installs their cleanup.
    };

    const startToastRendering = async () => {
      const layout = await layoutLoading;

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

        let selectedPortion: number;

        if (state.phase === "hidden") {
          selectedPortion = 0;
        } else if (state.phase === "shown") {
          selectedPortion = 1;
        } else if (state.phase === "exiting") {
          selectedPortion = Math.fround(1 - square);
        } else {
          selectedPortion = square;
        }

        const portion = selectedPortion;

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

        if (!disposed) {
          frame = requestAnimationFrame(tick);
        }
      };

      tick();

      if (disposed) {
        return;
      }

      window.addEventListener("resize", paint);
      window.addEventListener("scroll", paint, true);
      cleanup = () => {
        window.removeEventListener("resize", paint);
        window.removeEventListener("scroll", paint, true);
      };
    };

    void startToastRendering();

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
      className="pointer-events-none [visibility:var(--mc-intrinsic-registry-ui-minecraft-toast-graphic-1-visibility)] absolute top-0 left-0 h-full w-full"
      style={
        // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
        {
          "--mc-intrinsic-registry-ui-minecraft-toast-graphic-1-visibility":
            ready ? "visible" : "hidden",
        } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
      }
    />
  );
};
