// Geometry masks and masked comparison for projected references (ADR 0005).
//
// A projected reference compares only the pixels covered by declared
// geometry. The mask comes from two native frames of the same launch: the
// scene and the backdrop after the declared blocks are removed. A pixel is
// covered when the declared geometry changed it.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

/** SHA-256 of the Minecraft Java Edition 26.2 client JAR every native capture pins. */
export const MINECRAFT_26_2_JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

export const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

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

/** The straight RGBA pixels of `bounds` within a decoded image. */
export const cropRgba = (
  image: { data: Uint8Array; width: number },
  bounds: MaskBounds
) => {
  const data = new Uint8Array(bounds.width * bounds.height * 4);

  for (let row = 0; row < bounds.height; row += 1) {
    const start = ((bounds.y + row) * image.width + bounds.x) * 4;
    data.set(
      image.data.subarray(start, start + bounds.width * 4),
      row * bounds.width * 4
    );
  }

  return data;
};

interface FileIdentity {
  file: string;
  sha256: string;
}

/** One projected reference of a corpus: its reference image and geometry mask. */
export interface ProjectedReferenceFrame {
  coveredPixels: number;
  mask: FileIdentity;
  reference: FileIdentity;
}

export interface ProjectedComparison {
  /** Renders the UI port and returns the PNG screenshot of its subject. */
  capture: () => Promise<Uint8Array>;
  frame: ProjectedReferenceFrame;
  /** The firework tick of the reference case, recorded in metrics.json. */
  metrics?: { tick: number };
  /** The test's artifact path for a file name. */
  outputPath: (name: string) => string;
  /** The corpus directory the frame's files are relative to. */
  root: string;
  /**
   * When the screenshot is a whole scene of this size, the reference covers
   * only `bounds` within it. Otherwise the screenshot is the reference size.
   */
  scene?: { bounds: MaskBounds; height: number; width: number };
}

/**
 * Compares a fixture-rendered UI port with one projected reference within
 * its geometry mask at zero tolerance, after checking the reference and mask
 * bytes against the manifest. Writes actual.png, diff.png and metrics.json.
 */
export const compareWithProjectedReference = async ({
  capture,
  frame,
  metrics,
  outputPath,
  root,
  scene,
}: ProjectedComparison): Promise<MaskedComparison> => {
  const referenceFile = path.join(root, frame.reference.file);

  const [referenceBytes, maskBytes] = await Promise.all([
    readFile(referenceFile),
    readFile(path.join(root, frame.mask.file)),
  ]);

  assert.equal(sha256(referenceBytes), frame.reference.sha256, "reference");
  assert.equal(sha256(maskBytes), frame.mask.sha256, "mask");

  const expected = PNG.sync.read(referenceBytes);
  const mask = PNG.sync.read(maskBytes);

  if (scene !== undefined) {
    assert.deepEqual(
      [expected.width, expected.height],
      [scene.bounds.width, scene.bounds.height],
      "reference size"
    );
  }

  const covered = Uint8Array.from(
    { length: mask.width * mask.height },
    (_, pixel) => (mask.data[pixel * 4 + 3] === 255 ? 1 : 0)
  );

  assert.equal(
    covered.reduce((sum, value) => sum + value, 0),
    frame.coveredPixels,
    "covered pixels"
  );

  const actualBytes = await capture();
  const screenshot = PNG.sync.read(Buffer.from(actualBytes));

  assert.deepEqual(
    [screenshot.width, screenshot.height],
    scene === undefined
      ? [expected.width, expected.height]
      : [scene.width, scene.height],
    "screenshot size"
  );

  const actual =
    scene === undefined ? screenshot.data : cropRgba(screenshot, scene.bounds);

  const result = compareMasked(actual, expected.data, covered);
  const diff = new PNG({ height: expected.height, width: expected.width });
  diff.data.set(result.diff);

  await writeFile(outputPath("actual.png"), actualBytes);
  await writeFile(outputPath("diff.png"), PNG.sync.write(diff));
  await writeFile(
    outputPath("metrics.json"),
    JSON.stringify(
      {
        ...metrics,
        maskedPixels: result.maskedPixels,
        mismatchedPixels: result.mismatchedPixels,
        reference: referenceFile,
        tolerance: 0,
        totalPixels: result.totalPixels,
      },
      null,
      2
    )
  );

  return result;
};
