import { PNG } from "pngjs";
export function compareSelectPixels(expected: PNG, actual: PNG) {
  if (actual.width !== expected.width || actual.height !== expected.height)
    throw new Error("Select image geometry differs");
  const diff = new PNG({ width: actual.width, height: actual.height });
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
            expected.data[i] >> 2,
            expected.data[i + 1] >> 2,
            expected.data[i + 2] >> 2,
            255,
          ],
      i
    );
  }
  return { diff, mismatches };
}
