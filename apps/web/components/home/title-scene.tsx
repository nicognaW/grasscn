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

const splashWidth = Array.from(splash).reduce(
  (width, char) => width + minecraftGlyphs[char.charCodeAt(0) - 32][2],
  0
);

const splashPosition: React.CSSProperties & {
  "--grass-splash-left": string;
} = { "--grass-splash-left": `${-Math.trunc(splashWidth / 2)}px` };

export const TitleScene = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const node =
      // SAFETY: React attaches this always-rendered <div> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLDivElement result.
      ref.current as HTMLDivElement;

    const splashNode = node.querySelector<HTMLElement>(".grass-title-splash")!;
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
      <span className="grass-title-splash">
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
