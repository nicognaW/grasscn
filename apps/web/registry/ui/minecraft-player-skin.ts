/** Unused UV columns distinguish the standard three-pixel arm layout. */
export const inferPlayerSkinModel = function inferPlayerSkinModel(
  image: HTMLImageElement
): "wide" | "slim" {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  if (canvas.width !== 64 || canvas.height !== 64) {
    throw new Error("Player skins must be 64×64 PNG images");
  }

  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, 64, 64);

  for (const [x, y, width, height] of [
    [50, 16, 2, 4],
    [54, 20, 2, 12],
    [42, 48, 2, 4],
    [46, 52, 2, 12],
  ]) {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column++) {
        if (data[(row * 64 + column) * 4 + 3] !== 0) {
          return "wide";
        }
      }
    }
  }

  return "slim";
};
