import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import { minecraftItemAssets } from "./minecraft-item-assets";
import {
  itemMediaPixels,
  retainItemMedia,
  releaseItemMedia,
} from "./minecraft-item-media-gpu";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-registry-ui-minecraft-item-media-1-visibility": string;
}

interface IntrinsicLayoutStyle2 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-registry-ui-minecraft-item-media-2-visibility": string;
}

export const MinecraftItemMedia = ({ scale }: { scale: 1 | 2 | 3 }) => {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const [painted, setPainted] = React.useState(false);

  React.useLayoutEffect(() => {
    retainItemMedia();

    const node =
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous layout effect setup reads the owned canvas ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      canvas.current as HTMLCanvasElement;

    const media = node.parentElement!;
    const root = node.closest<HTMLElement>(".mc-item") ?? media;

    let signature = "";
    let inside = root.matches(":hover");
    let pointer: { x: number; y: number } | undefined;

    const paint = () => {
      const rect = node.getBoundingClientRect();
      const mediaBounds = media.getBoundingClientRect();
      const hovered = root.dataset.mcItemInteractive === "true" && inside;

      const overIcon = pointer
        ? pointer.x >= mediaBounds.left &&
          pointer.x < mediaBounds.right &&
          pointer.y >= mediaBounds.top &&
          pointer.y < mediaBounds.bottom
        : media.matches(":hover");

      let _selectedState: 0 | 1 | 2;

      if (hovered) {
        _selectedState = overIcon ? 2 : 1;
      } else {
        _selectedState = 0;
      }

      const state: 0 | 1 | 2 = _selectedState;

      const key = [rect.x, rect.y, innerWidth, innerHeight, state, scale].join(
        ":"
      );

      if (key === signature) {
        return;
      }

      signature = key;
      const pixels = itemMediaPixels(state, scale, rect.x, rect.y);

      if (!pixels) {
        setPainted(false);

        return;
      }

      const canvasSide = 32 * scale;
      node.height = canvasSide;
      node.width = canvasSide;
      const context = node.getContext("2d");

      if (!context) {
        throw new Error(
          "Minecraft item media 2D canvas context could not be created"
        );
      }

      context.putImageData(new ImageData(pixels, 32 * scale, 32 * scale), 0, 0);
      node.dataset.mcItemMediaState = String(state);
      setPainted(true);
    };

    const enter = (event: PointerEvent) => {
      inside = true;
      const pointerEvent = event;
      pointer = { x: pointerEvent.clientX, y: pointerEvent.clientY };
      paint();
    };

    const leave = () => {
      inside = false;
      pointer = undefined;
      paint();
    };

    const move = (event: PointerEvent) => {
      const pointerEvent = event;
      pointer = { x: pointerEvent.clientX, y: pointerEvent.clientY };
      paint();
    };

    const observer = new ResizeObserver(paint);
    observer.observe(node);
    observer.observe(root);

    const frame = requestAnimationFrame(paint);
    const timer = setInterval(paint, 100);

    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("pointermove", move);
    window.addEventListener("scroll", paint, true);
    window.addEventListener("resize", paint);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearInterval(timer);
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", paint, true);
      window.removeEventListener("resize", paint);
      releaseItemMedia();
    };
  }, [scale]);

  return (
    <>
      <img
        alt=""
        aria-hidden="true"
        draggable={false}
        src={minecraftItemAssets.thumbnail.image}
        className="mc-item-thumbnail [visibility:var(--mc-intrinsic-registry-ui-minecraft-item-media-1-visibility)]"
        style={
          // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
          {
            "--mc-intrinsic-registry-ui-minecraft-item-media-1-visibility":
              painted ? "hidden" : "visible",
          } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
        }
      />
      <canvas
        ref={canvas}
        aria-hidden="true"
        data-mc-item-media-ready={painted}
        className="mc-item-thumbnail [visibility:var(--mc-intrinsic-registry-ui-minecraft-item-media-2-visibility)]"
        style={
          // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
          {
            "--mc-intrinsic-registry-ui-minecraft-item-media-2-visibility":
              painted ? "visible" : "hidden",
          } satisfies IntrinsicLayoutStyle2 as IntrinsicLayoutStyle2
        }
      />
    </>
  );
};
