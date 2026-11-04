// Geometry masks and masked comparison for projected references (ADR 0005).
//
// A projected reference compares only the pixels covered by declared
// geometry. The mask comes from two native frames of the same launch: the
// scene and the backdrop after the declared blocks are removed. A pixel is
// covered when the declared geometry changed it.

export interface MaskBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface GeometryMask {
  bounds: MaskBounds;
  /** One byte per pixel: 1 covered by geometry, 0 backdrop. */
  covered: Uint8Array;
  coveredPixels: number;
}

const pixelDiffers = (a: Uint8Array, b: Uint8Array, offset: number) =>
  a[offset] !== b[offset] ||
  a[offset + 1] !== b[offset + 1] ||
  a[offset + 2] !== b[offset + 2] ||
  a[offset + 3] !== b[offset + 3];

export const deriveGeometryMask = (
  scene: Uint8Array,
  backdrop: Uint8Array,
  width: number,
  height: number
): GeometryMask => {
  if (scene.length !== width * height * 4 || backdrop.length !== scene.length) {
    throw new Error("Native frame dimensions disagree");
  }

  const covered = new Uint8Array(width * height);
  let coveredPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;

      if (pixelDiffers(scene, backdrop, pixel * 4)) {
        covered[pixel] = 1;
        coveredPixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (coveredPixels === 0) {
    throw new Error("The native frames show no geometry");
  }

  return {
    bounds: {
      height: maxY - minY + 1,
      width: maxX - minX + 1,
      x: minX,
      y: minY,
    },
    covered,
    coveredPixels,
  };
};

export interface MaskedComparison {
  /** Magenta where a covered pixel differs, dimmed reference where it matches, clear outside the mask. */
  diff: Uint8Array;
  maskedPixels: number;
  mismatchedPixels: number;
  totalPixels: number;
}

export const compareMasked = (
  actual: Uint8Array,
  reference: Uint8Array,
  covered: Uint8Array
): MaskedComparison => {
  if (
    actual.length !== reference.length ||
    reference.length !== covered.length * 4
  ) {
    throw new Error("Masked comparison dimensions disagree");
  }

  const diff = new Uint8Array(reference.length);
  let maskedPixels = 0;
  let mismatchedPixels = 0;

  for (let pixel = 0; pixel < covered.length; pixel += 1) {
    const offset = pixel * 4;

    if (covered[pixel] === 1) {
      maskedPixels += 1;

      if (pixelDiffers(actual, reference, offset)) {
        mismatchedPixels += 1;
        diff.set([255, 0, 255, 255], offset);
      } else {
        diff.set(
          [
            Math.trunc((reference[offset] ?? 0) / 4),
            Math.trunc((reference[offset + 1] ?? 0) / 4),
            Math.trunc((reference[offset + 2] ?? 0) / 4),
            255,
          ],
          offset
        );
      }
    }
  }

  return { diff, maskedPixels, mismatchedPixels, totalPixels: covered.length };
};
