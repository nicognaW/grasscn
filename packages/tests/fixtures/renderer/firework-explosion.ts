// Rendering fixture for the firework explosion UI port:
// /firework-explosion.html?tick=8
//
// The frame is composited over the projected scene's open-sky colour, so
// translucent particle pixels blend as they do natively; outside the
// particles the backdrop is a declared web adaptation and is not compared.
import { fireworkTextures } from "@grasscn/web/ui/minecraft-firework-assets";
import {
  FIREWORK_SCENE,
  loadFireworkSprites,
  renderFireworkExplosionFrame,
} from "@grasscn/web/ui/minecraft-firework-explosion";

const NOON_SKY = [181, 208, 255] as const;

const canvas = document.querySelector<HTMLCanvasElement>("#subject");
const context = canvas?.getContext("2d");

if (canvas === null || context === null || context === undefined) {
  throw new Error("Fixture canvas missing");
}

const tick = Number(new URLSearchParams(location.search).get("tick") ?? "0");
const sprites = await loadFireworkSprites(fireworkTextures);

const rgba = renderFireworkExplosionFrame(sprites, tick, {
  backdrop: NOON_SKY,
});

context.putImageData(
  new ImageData(
    Uint8ClampedArray.from(rgba),
    FIREWORK_SCENE.width,
    FIREWORK_SCENE.height
  ),
  0,
  0
);

canvas.dataset.rendered = "true";
