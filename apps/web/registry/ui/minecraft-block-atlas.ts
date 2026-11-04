// Minecraft Java Edition 26.2 block-atlas mipmap generation, ported from
// net.minecraft.client.renderer.texture.MipmapGenerator.generateMipLevels
// (MipmapStrategy.MEAN, chosen by AUTO for opaque sprites) and
// net.minecraft.util.ARGB.meanLinear / srgbToLinearChannel / linearToSrgbChannel.
//
// Java float arithmetic is reproduced with Math.fround where the original
// rounds to float.

const LINEAR_CHANNEL_DEPTH = 1023;
const f = Math.fround;

// ARGB.computeSrgbToLinear(float)
const computeSrgbToLinear = (value: number) =>
  value >= f(0.04045)
    ? f(((value + 0.055) / 1.055) ** 2.4)
    : f(value / f(12.92));

// ARGB.computeLinearToSrgb(float)
const computeLinearToSrgb = (value: number) =>
  value >= f(0.0031308)
    ? f(1.055 * value ** 0.4166666666666667 - 0.055)
    : f(f(12.92) * value);

// Java Math.round(float): nearest integer, ties towards positive infinity.
const javaRound = (value: number) => Math.floor(value + 0.5);

// ARGB.SRGB_TO_LINEAR: short[256]
const SRGB_TO_LINEAR = Uint16Array.from({ length: 256 }, (_, index) =>
  javaRound(f(computeSrgbToLinear(f(index / 255)) * LINEAR_CHANNEL_DEPTH))
);

// ARGB.LINEAR_TO_SRGB: byte[1024], read back with & 255
const LINEAR_TO_SRGB = Uint8Array.from(
  { length: LINEAR_CHANNEL_DEPTH + 1 },
  (_, index) =>
    // Java narrows to byte and reads it back with & 255.
    javaRound(f(computeLinearToSrgb(f(index / LINEAR_CHANNEL_DEPTH)) * 255)) %
    256
);

const channel = (rgba: Uint8Array, offset: number) => rgba[offset] ?? 0;

// ARGB.linearChannelMean(int, int, int, int)
const linearChannelMean = (channels: readonly number[]) =>
  LINEAR_TO_SRGB[
    Math.trunc(
      channels.reduce((sum, value) => sum + (SRGB_TO_LINEAR[value] ?? 0), 0) / 4
    )
  ] ?? 0;

export interface RgbaImage {
  data: Uint8Array;
  height: number;
  width: number;
}

/**
 * The next mip level of an opaque block sprite: each texel is the linear-light
 * mean of the 2x2 texels above it, alpha the integer mean.
 */
export const nextMipLevel = (image: RgbaImage): RgbaImage => {
  const width = Math.trunc(image.width / 2);
  const height = Math.trunc(image.height / 2);
  const data = new Uint8Array(width * height * 4);

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const offsets = [
        (y * 2 * image.width + x * 2) * 4,
        (y * 2 * image.width + x * 2 + 1) * 4,
        ((y * 2 + 1) * image.width + x * 2) * 4,
        ((y * 2 + 1) * image.width + x * 2 + 1) * 4,
      ] as const;

      const target = (y * width + x) * 4;

      for (let component = 0; component < 3; component += 1) {
        data[target + component] = linearChannelMean(
          offsets.map((offset) => channel(image.data, offset + component))
        );
      }

      data[target + 3] = Math.trunc(
        offsets.reduce(
          (sum, offset) => sum + channel(image.data, offset + 3),
          0
        ) / 4
      );
    }
  }

  return { data, height, width };
};
