"use client";

// The Minecraft Java Edition 26.2 firework rocket as a page effect: each
// launch runs one rocket simulation (flight, trail, star explosion) at 20
// ticks per second, plays the native sounds each tick returns, and draws the
// frames into one shared canvas whose launch point sits on the anchor.
import { fireworkTextures } from "./minecraft-firework-assets";
import {
  createFireworkTarget,
  loadFireworkSprites,
} from "./minecraft-firework-explosion";
import {
  FIREWORK_ROCKET_LAUNCH_PIXEL,
  FIREWORK_ROCKET_SCENE,
  FIREWORK_ROCKET_SPAWN,
  FireworkRocketSimulation,
  drawFireworkRocketFrame,
} from "./minecraft-firework-rocket";
import { playFireworkSounds } from "./minecraft-firework-sound";
import { decodePng } from "./minecraft-png";

const TICK_MILLISECONDS = 50;
const { height: HEIGHT, width: WIDTH } = FIREWORK_ROCKET_SCENE;
const [LAUNCH_X, LAUNCH_Y] = FIREWORK_ROCKET_LAUNCH_PIXEL;

interface Launch {
  anchor: Element;
  // Sound only, no drawing (prefers-reduced-motion).
  drawn: boolean;
  simulation: FireworkRocketSimulation;
  start: number;
}

const loadTextures = async () => {
  const [sprites, rocket] = await Promise.all([
    loadFireworkSprites(fireworkTextures),
    decodePng(fireworkTextures.rocket),
  ]);

  return { rocket, sprites };
};

type Textures = Awaited<ReturnType<typeof loadTextures>>;

// Decoded once per page and shared by every launch.
let texturesRequested = false;
let textures: Textures | undefined;
const launches = new Set<Launch>();
let canvas: HTMLCanvasElement | undefined;
let frame = 0;

const sharedCanvas = (page: Document) => {
  if (canvas !== undefined) {
    return canvas;
  }

  const element = page.createElement("canvas");
  element.width = WIDTH;
  element.height = HEIGHT;
  element.dataset.slot = "fireworks";
  element.setAttribute("aria-hidden", "true");
  // Intrinsic size at DPR 1, above the page and transparent to the pointer.
  Object.assign(element.style, {
    height: `${HEIGHT}px`,
    left: "0",
    pointerEvents: "none",
    position: "fixed",
    top: "0",
    width: `${WIDTH}px`,
    zIndex: "2147483647",
  });
  page.body.append(element);
  canvas = element;

  return element;
};

// The shared canvas follows the latest drawn launch's anchor: the scene's
// launch pixel sits on the anchor's bottom centre. A detached anchor (the
// page navigated away) leaves the canvas where it was.
const place = (element: HTMLCanvasElement, anchor: Element) => {
  if (!anchor.isConnected) {
    return;
  }

  const bounds = anchor.getBoundingClientRect();
  const left = Math.round(bounds.left + bounds.width / 2 - LAUNCH_X);
  const top = Math.round(bounds.bottom - LAUNCH_Y);
  element.style.transform = `translate(${left}px, ${top}px)`;
};

const draw = (now: number) => {
  const drawn = [...launches].filter((launch) => launch.drawn);
  const latest = drawn.at(-1);

  if (latest === undefined) {
    canvas?.remove();
    canvas = undefined;

    return;
  }

  const element = sharedCanvas(latest.anchor.ownerDocument);
  const context = element.getContext("2d");

  place(element, latest.anchor);

  if (textures === undefined || context === null) {
    return;
  }

  const target = createFireworkTarget(FIREWORK_ROCKET_SCENE);

  for (const launch of drawn) {
    // Between ticks the frame is interpolated as the game renders it.
    const elapsed = (now - launch.start) / TICK_MILLISECONDS;

    const partialTick = Math.min(
      1,
      Math.max(0, elapsed - (launch.simulation.ticks - 1))
    );

    drawFireworkRocketFrame(target, launch.simulation, textures, partialTick);
  }

  context.putImageData(
    new ImageData(new Uint8ClampedArray(target.color), WIDTH, HEIGHT),
    0,
    0
  );
  element.dataset.rendered = "true";
};

const step = (now: number) => {
  for (const launch of launches) {
    // Tick 1 ran on the click; tick n is due (n - 1) ticks later.
    const due = 1 + Math.floor((now - launch.start) / TICK_MILLISECONDS);

    while (launch.simulation.ticks < due && !launch.simulation.done) {
      playFireworkSounds(launch.simulation.tick());
    }

    if (launch.simulation.done) {
      launches.delete(launch);
    }
  }

  draw(now);
  frame = launches.size === 0 ? 0 : requestAnimationFrame(step);
};

const prefersReducedMotion = (anchor: Element) =>
  anchor.ownerDocument.defaultView?.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches ?? false;

/**
 * Launches one firework rocket from `anchor`. Every launch uses the same
 * fixed seeds, and overlapping launches run as independent instances on the
 * one shared canvas. Under `prefers-reduced-motion` only the sounds play.
 */
export const launchFireworks = (anchor: Element) => {
  const launch: Launch = {
    anchor,
    drawn: !prefersReducedMotion(anchor),
    simulation: new FireworkRocketSimulation(FIREWORK_ROCKET_SPAWN),
    start: performance.now(),
  };

  // The first tick (and its launch sound) runs inside the user activation.
  playFireworkSounds(launch.simulation.tick());
  launches.add(launch);

  if (launch.drawn && !texturesRequested) {
    texturesRequested = true;
    void loadTextures().then((decoded) => {
      textures = decoded;

      return decoded;
    });
  }

  draw(launch.start);

  if (frame === 0) {
    frame = requestAnimationFrame(step);
  }
};

/** Returns `launch(anchor)`, which launches the fireworks from `anchor`. */
export const useFireworks = () => launchFireworks;
