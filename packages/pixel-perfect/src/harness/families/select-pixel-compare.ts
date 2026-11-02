import { PNG } from "pngjs";

export const compareSelectPixels = function compareSelectPixels(
  expected: PNG,
  actual: PNG
) {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error("Select image geometry differs");
  }

  const diff = new PNG({ height: actual.height, width: actual.width });
  let mismatches = 0;

  for (let i = 0; i < actual.data.length; i += 4) {
    const mismatch = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatches += Number(mismatch);
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            Math.floor(expected.data[i] / 4),
            Math.floor(expected.data[i + 1] / 4),
            Math.floor(expected.data[i + 2] / 4),
            255,
          ],
      i
    );
  }

  return { diff, mismatches };
};
