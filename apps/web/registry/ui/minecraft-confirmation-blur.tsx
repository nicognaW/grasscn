import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import { useConfirmationSnapshot } from "./minecraft-confirmation-snapshot";

interface IntrinsicLayoutStyle2 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-registry-ui-minecraft-confirmation-blur-2-visibility": string;
}

// Screen's post-effect is six alternating box passes, not a Gaussian blur.
// This SVG path is still under native pixel verification.
export const MinecraftConfirmationBlur = ({
  radius,
  identity,
}: {
  radius: number;
  identity: string;
}) => {
  const ref = React.useRef<SVGSVGElement>(null);
  const id = React.useId().replaceAll(/[^a-zA-Z0-9_-]/gu, "");

  const canvas = React.useRef<HTMLCanvasElement>(null);
  const ready = useConfirmationSnapshot(canvas, identity, radius);

  const size = 2 * Math.max(0, Math.round(radius)) + 1;
  React.useLayoutEffect(() => {
    const host =
      // SAFETY: React attaches this always-rendered <svg> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact SVGSVGElement result.
      (ref.current as SVGSVGElement).parentElement!;

    if (radius > 0 && !ready) {
      host.style.backdropFilter = `url(#${id})`;
    } else {
      host.style.removeProperty("backdrop-filter");
    }

    host.dataset.mcConfirmationBackdropReady = "true";

    return () => {
      host.style.removeProperty("backdrop-filter");
      delete host.dataset.mcConfirmationBackdropReady;
    };
  }, [id, radius, ready]);

  return (
    <>
      <svg
        ref={ref}
        width="0"
        height="0"
        aria-hidden="true"
        className="pointer-events-none absolute"
      >
        <defs>
          <filter
            id={id}
            x="0"
            y="0"
            width="1"
            height="1"
            colorInterpolationFilters="sRGB"
          >
            {Array.from({ length: radius > 0 ? 6 : 0 }, (_, pass) => (
              <feConvolveMatrix
                key={pass}
                order={pass % 2 ? `1 ${size}` : `${size} 1`}
                kernelMatrix={Array.from({ length: size }, () => 1).join(" ")}
                divisor={size}
                edgeMode="duplicate"
                preserveAlpha
              />
            ))}
          </filter>
        </defs>
      </svg>
      <canvas
        ref={canvas}
        aria-hidden="true"
        className="pointer-events-none [visibility:var(--mc-intrinsic-registry-ui-minecraft-confirmation-blur-2-visibility)] absolute [inset:0] h-full w-full"
        style={
          // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
          {
            "--mc-intrinsic-registry-ui-minecraft-confirmation-blur-2-visibility":
              ready && radius > 0 ? "visible" : "hidden",
          } satisfies IntrinsicLayoutStyle2 as IntrinsicLayoutStyle2
        }
      />
    </>
  );
};
