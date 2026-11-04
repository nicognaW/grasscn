import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  compareMasked,
  deriveGeometryMask,
} from "../../src/harness/projected-reference";

// 3x2 RGBA images written out literally; the expected values come from the
// pixel layout below, not from the code under test.
const sky = [120, 160, 255, 255];
const lamp = [70, 40, 20, 255];
const glow = [240, 190, 110, 255];

const image = (...pixels: number[][]) => Uint8Array.from(pixels.flat());

test("the geometry mask covers exactly the pixels the declared blocks changed", () => {
  const scene = image(sky, lamp, glow, sky, lamp, sky);
  const backdrop = image(sky, sky, sky, sky, sky, sky);

  const mask = deriveGeometryMask(scene, backdrop, 3, 2);

  assert.deepEqual([...mask.covered], [0, 1, 1, 0, 1, 0]);
  assert.deepEqual(mask.bounds, { height: 2, width: 2, x: 1, y: 0 });
  assert.equal(mask.coveredPixels, 3);
});

test("a geometry mask needs geometry", () => {
  const frame = image(sky, sky, sky, sky, sky, sky);

  assert.throws(() => deriveGeometryMask(frame, frame, 3, 2), /no geometry/u);
});

test("masked comparison ignores the uncovered backdrop", () => {
  const reference = image(lamp, glow, sky, lamp);
  const actual = image(lamp, glow, [0, 0, 0, 0], lamp);
  const covered = Uint8Array.from([1, 1, 0, 1]);

  const result = compareMasked(actual, reference, covered);

  assert.equal(result.mismatchedPixels, 0);
  assert.equal(result.maskedPixels, 3);
  assert.equal(result.totalPixels, 4);
});

test("masked comparison fails on a one-pixel change within the mask", () => {
  const reference = image(lamp, glow, sky, lamp);
  const changed = image(lamp, [240, 190, 111, 255], sky, lamp);
  const covered = Uint8Array.from([1, 1, 0, 1]);

  const result = compareMasked(changed, reference, covered);

  assert.equal(result.mismatchedPixels, 1);
  // The diff marks the mismatch magenta and leaves uncovered pixels clear.
  assert.deepEqual([...result.diff.subarray(4, 8)], [255, 0, 255, 255]);
  assert.deepEqual([...result.diff.subarray(8, 12)], [0, 0, 0, 0]);
});

test("masked comparison refuses images of different sizes", () => {
  assert.throws(
    () =>
      compareMasked(image(lamp), image(lamp, lamp), Uint8Array.from([1, 1])),
    /dimensions/u
  );
});
