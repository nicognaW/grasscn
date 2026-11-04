"use client";

import { useEffect, useRef } from "react";

import { netherStarTextures } from "../lib/minecraft-nether-star-assets";
import { NETHER_STAR_SIZE, renderNetherStar } from "../lib/nether-star";
import { decodePng } from "../registry/ui/minecraft-png";

const loadTextures = async () => {
  const [item, glint] = await Promise.all([
    decodePng(netherStarTextures.item),
    decodePng(netherStarTextures.glint),
  ]);

  return { glint, item };
};

type Textures = Awaited<ReturnType<typeof loadTextures>>;

// Decoded once per page and shared by every star.
let textures: Promise<Textures> | undefined;

const sharedTextures = async () => {
  textures ??= loadTextures();

  return await textures;
};

/**
 * The nether star GUI item at GUI scale 2 with its animated enchantment
 * glint (a site-only UI port). It is decorative: the surrounding control
 * names it. Pass `glintMillis` to draw one fixed glint time; otherwise the
 * glint follows the page clock, a web adaptation of the game's
 * Util.getMillis() origin.
 */
export const NetherStar = ({ glintMillis }: { glintMillis?: number }) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let frame = 0;
    let stopped = false;

    const start = async (element: HTMLCanvasElement | null) => {
      const context = element?.getContext("2d");

      if (element === null || context === null || context === undefined) {
        return;
      }

      const decoded = await sharedTextures();

      const draw = (millis: number) => {
        context.putImageData(
          new ImageData(
            renderNetherStar(decoded.item, decoded.glint, millis),
            NETHER_STAR_SIZE,
            NETHER_STAR_SIZE
          ),
          0,
          0
        );
        element.dataset.rendered = "true";
      };

      if (stopped) {
        return;
      }

      if (glintMillis !== undefined) {
        draw(glintMillis);

        return;
      }

      const animate = () => {
        draw(Math.floor(performance.now()));
        frame = requestAnimationFrame(animate);
      };

      animate();
    };

    void start(canvas.current);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [glintMillis]);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      data-slot="nether-star"
      height={NETHER_STAR_SIZE}
      width={NETHER_STAR_SIZE}
    />
  );
};
