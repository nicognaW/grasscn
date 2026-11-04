"use client";

import type { StaticImageData } from "next/image";
import Image from "next/image";
import * as React from "react";

import title from "../../assets/grasscn-title.svg";
import { minecraftGlyphs } from "../../registry/ui/minecraft-font";
import { MinecraftText } from "../../registry/ui/minecraft-text";
import { splashMotion, splashTransform } from "../../splash-motion";

// Next's image loader emits src/width/height; SVG imports are otherwise typed any.
const isTitleImage = (value: unknown): value is StaticImageData =>
  value !== null &&
  typeof value === "object" &&
  "src" in value &&
  typeof value.src === "string" &&
  "width" in value &&
  typeof value.width === "number" &&
  "height" in value &&
  typeof value.height === "number";

const titleSource = (() => {
  const asset: unknown = title;

  if (!isTitleImage(asset)) {
    throw new Error("Bundled title image metadata required");
  }

  return asset;
})();

const splash = "Now with components!";

// SAFETY: The private splash is the fixed ASCII literal above; every Array.from character has exactly one nonempty code unit with the same code point.
/* oxlint-disable typescript/no-unsafe-type-assertion -- The fixed ASCII splash producer proves this exact codePointAt(0) result. */
const splashWidth = Array.from(
  splash,
  (char) => minecraftGlyphs[(char.codePointAt(0) as number) - 32][2]
).reduce((width, advance) => width + advance, 0);
/* oxlint-enable typescript/no-unsafe-type-assertion */

const splashPosition: React.CSSProperties & {
  "--grass-splash-left": string;
} = { "--grass-splash-left": `${-Math.trunc(splashWidth / 2)}px` };

export const TitleScene = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const splashRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const node =
      // SAFETY: React attaches this always-rendered <div> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLDivElement result.
      ref.current as HTMLDivElement;

    // SAFETY: The splash is one private, unkeyed, always-rendered span; React attaches it before layout setup, and existing cleanup cancels every deferred painter.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The owned intrinsic span commit and cancellation lifetime prove this exact HTMLSpanElement capture.
    const splashNode = splashRef.current as HTMLSpanElement;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = true;
    let guiScale = 1;

    const paint = (time: number) => {
      splashNode.style.transform = splashTransform(
        splashMotion(time, splashWidth),
        guiScale
      );
    };

    const tick = () => {
      paint(performance.now());
      frame = requestAnimationFrame(tick);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      guiScale =
        Number(getComputedStyle(node).getPropertyValue("--title-gui-scale")) ||
        1;
      const running = visible && !document.hidden && !motion.matches;
      splashNode.dataset.motion = running ? "running" : "paused";

      if (running) {
        paint(performance.now());
        frame = requestAnimationFrame(tick);
      } else {
        paint(0);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });

    const resize = new ResizeObserver(sync);
    observer.observe(node);
    resize.observe(node);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div ref={ref} className="grass-title-scene">
      <h1 id="grass-title">
        <span className="sr-only">grasscn</span>
        <Image
          src={titleSource}
          width={260}
          height={64}
          alt=""
          aria-hidden="true"
          unoptimized
        />
      </h1>
      <span ref={splashRef} className="grass-title-splash">
        <span
          className="grass-title-splash-origin -top-[8px] left-(--grass-splash-left)"
          style={splashPosition}
        >
          <MinecraftText>{splash}</MinecraftText>
        </span>
      </span>
    </div>
  );
};
