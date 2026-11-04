// Rendering fixture for the firework rocket UI port:
// /firework-rocket.html?tick=12
//
// The frame is composited over the projected scene's open-sky colour, so
// translucent particle pixels blend as they do natively; outside the rocket
// and its particles the backdrop is a declared web adaptation and is not
// compared.
import { fireworkTextures } from "@grasscn/web/ui/minecraft-firework-assets";
import { loadFireworkSprites } from "@grasscn/web/ui/minecraft-firework-explosion";
import {
  FIREWORK_ROCKET_SCENE,
  renderFireworkRocketFrame,
} from "@grasscn/web/ui/minecraft-firework-rocket";
import { decodePng } from "@grasscn/web/ui/minecraft-png";

const NOON_SKY = [181, 208, 255] as const;

const canvas = document.querySelector<HTMLCanvasElement>("#subject");
const context = canvas?.getContext("2d");

if (canvas === null || context === null || context === undefined) {
  throw new Error("Fixture canvas missing");
}

const tick = Number(new URLSearchParams(location.search).get("tick") ?? "0");

const [sprites, rocket] = await Promise.all([
  loadFireworkSprites(fireworkTextures),
  decodePng(fireworkTextures.rocket),
]);

const rgba = renderFireworkRocketFrame({ rocket, sprites }, tick, {
  backdrop: NOON_SKY,
});

context.putImageData(
  new ImageData(
    Uint8ClampedArray.from(rgba),
    FIREWORK_ROCKET_SCENE.width,
    FIREWORK_ROCKET_SCENE.height
  ),
  0,
  0
);

canvas.dataset.rendered = "true";
