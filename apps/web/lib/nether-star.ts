// UI port of the Minecraft Java Edition 26.2 nether star GUI item with its
// standard enchantment glint, at GUI scale 2 (a 32x32 pixel item). It
// reproduces what the vanilla GuiItemAtlas draws on llvmpipe, verified
// against captured references at fixed glint times
// (packages/pixel-perfect/tests/reference/nether-star).
//
// The native pipeline, in order:
// 1. ITEM_CUTOUT draws the front face of the generated item model into a
//    32x32 slot of the 512x512 UI item atlas. ITEMS_FLAT lighting of the
//    front face saturates (min(1, 0.6 * (0.9597 + 0.0966) + 0.4)) and the
//    full-bright lightmap texel is white, so opaque texels are written
//    unchanged; transparent texels are discarded.
// 2. The GLINT pipeline draws the same quad with depth test EQUAL, the
//    enchanted_glint_item texture (128x128, LINEAR, REPEAT) at texture
//    coordinates TextureMat * UV0 and the GLINT blend function
//    (SRC_COLOR, ONE): destination + source * source.
// 3. GUI_TEXTURED_PREMULTIPLIED_ALPHA blits the slot 1:1 with NEAREST
//    sampling, so opaque pixels reach the screen unchanged and transparent
//    ones leave the background.
import type { PngRgba } from "../registry/ui/minecraft-png";

const f = Math.fround;

/** Edge length in pixels of the item at GUI scale 2. */
export const NETHER_STAR_SIZE = 32;

// The vanilla 26.2 item atlas (1024x512) places item/nether_star at
// (18, 364) with one texel of padding, so its texels start at (19, 365);
// the quad's UV0 are those atlas coordinates.
const ITEM_ATLAS_WIDTH = 1024;
const ITEM_ATLAS_HEIGHT = 512;
const SPRITE_X = 19;
const SPRITE_Y = 365;
const SPRITE_SIZE = 16;

const U0 = f(SPRITE_X / ITEM_ATLAS_WIDTH);
const U1 = f((SPRITE_X + SPRITE_SIZE) / ITEM_ATLAS_WIDTH);
const V0 = f(SPRITE_Y / ITEM_ATLAS_HEIGHT);
const V1 = f((SPRITE_Y + SPRITE_SIZE) / ITEM_ATLAS_HEIGHT);

// TextureTransform.setupGlintTexturing(8): translation(-f, g, 0)
// .rotateZ(0.17453292).scale(8). The rotation and scale part is the same at
// every time; these are its float entries as JOML computes them natively.
const GLINT_COS = f(7.878461837768555);
const GLINT_SIN = f(1.3891854286193848);

// Default options: glintSpeed 0.5 (a double), glintStrength 0.75 (the
// GlintAlpha uniform).
const GLINT_SPEED = 0.5;
const GLINT_ALPHA = f(0.75);

const GLINT_TEXTURE_SIZE = 128;

/**
 * The glint TextureMat at a glint time in milliseconds, column-major, as
 * TextureTransform.setupGlintTexturing(8) computes it.
 */
export const glintTextureMatrix = (glintMillis: number) => {
  // (long) (millis * glintSpeed * 8.0), then float divisions.
  const phase = Math.trunc(glintMillis * GLINT_SPEED * 8);
  const translateS = f(-f((phase % 110_000) / 110_000));
  const translateT = f((phase % 30_000) / 30_000);

  // prettier-ignore
  return [
    GLINT_COS, GLINT_SIN, 0, 0,
    f(-GLINT_SIN), GLINT_COS, 0, 0,
    0, 0, 8, 0,
    translateS, translateT, 0, 1,
  ];
};

// Float to unorm8 as llvmpipe converts it: scale by 255/256 in float, then
// add 2^15 so float rounding (to nearest, ties to even) leaves the byte in
// the low mantissa bits.
const UNORM8_SCALE = f(255 / 256);
const UNORM8_BIAS = 32_768;

const unorm8 = (value: number) => {
  const biased = f(
    f(Math.min(1, Math.max(0, value)) * UNORM8_SCALE) + UNORM8_BIAS
  );

  return Math.round((biased - UNORM8_BIAS) * 256);
};

// Unorm8 to float as llvmpipe converts texels: float(byte) * (1/255f).
const UNORM8_TO_FLOAT = f(1 / 255);

const unorm8ToFloat = (byte: number) => f(byte * UNORM8_TO_FLOAT);

// Normalised 8-bit multiply a * b / 255 with rounding, as the unorm8 blend.
const mulNorm = (a: number, b: number) => {
  const product = a * b + 128;

  return Math.floor((product + Math.floor(product / 256)) / 256);
};

// Round to nearest, ties to even (cvtps2dq).
const roundEven = (value: number) => {
  const rounded = Math.round(value);

  return rounded - value === 0.5 && rounded % 2 !== 0 ? rounded - 1 : rounded;
};

interface Vertex {
  s: number;
  t: number;
  // GL window coordinates of the item atlas (origin bottom-left).
  x: number;
  y: number;
}

// Triangle setup as llvmpipe evaluates it: one plane per attribute and
// triangle, a(x, y) = a0 + dadx x + dady y at integer pixel coordinates
// (centres at +0.5), with multiply-adds fused. The float product is exact
// in double, so f(a * b + c) rounds once like a fused multiply-add.
const plane = (a: Vertex, b: Vertex, c: Vertex, key: "s" | "t") => {
  const dx01 = f(a.x - b.x);
  const dy01 = f(a.y - b.y);
  const dx20 = f(c.x - a.x);
  const dy20 = f(c.y - a.y);
  const oneOverArea = f(1 / f(f(dx01 * dy20) - f(dx20 * dy01)));
  const da01 = f(a[key] - b[key]);
  const da20 = f(c[key] - a[key]);
  const dadx = f(f(da01 * dy20 - f(dy01 * da20)) * oneOverArea);
  const dady = f(f(da20 * dx01 - f(dx20 * da01)) * oneOverArea);
  const a0 = f(a[key] - f(dadx * f(a.x - 0.5) + f(dady * f(a.y - 0.5))));

  return (x: number, y: number) => f(dady * y + f(dadx * x + a0));
};

// Pixel centres on a left edge, or on a bottom edge in GL window
// coordinates, belong to the triangle.
const covers = (a: Vertex, b: Vertex, c: Vertex, x: number, y: number) => {
  const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const sign = area > 0 ? 1 : -1;

  return [
    [a, b],
    [b, c],
    [c, a],
  ].every(([from, to]) => {
    if (from === undefined || to === undefined) {
      return false;
    }

    const dx = (to.x - from.x) * sign;
    const dy = (to.y - from.y) * sign;
    const value = dx * (y - from.y) - dy * (x - from.x);

    return value > 0 || (value === 0 && (dy < 0 || (dy === 0 && dx > 0)));
  });
};

// Floor division and the non-negative remainder of 8.8 fixed point and
// repeat wrapping, as llvmpipe's arithmetic shifts and masks compute them.
const floorDiv = (value: number, divisor: number) =>
  Math.floor(value / divisor);

const wrapped = (value: number, size: number) =>
  value - floorDiv(value, size) * size;

// One filter lerp, rounded back to a byte.
const lerp = (weight: number, from: number, to: number) =>
  from + floorDiv(weight * (to - from) + 128, 256);

// llvmpipe's 8-bit bilinear filter: coordinates in 8.8 fixed point (texel
// centres at .5, rounded), repeat wrapping, and each lerp rounded to a byte.
const sampleGlint = (glint: PngRgba, s: number, t: number) => {
  const fixedS = roundEven(f(f(f(s * GLINT_TEXTURE_SIZE) - 0.5) * 256));
  const fixedT = roundEven(f(f(f(t * GLINT_TEXTURE_SIZE) - 0.5) * 256));
  const column = floorDiv(fixedS, 256);
  const row = floorDiv(fixedT, 256);
  const weightS = wrapped(fixedS, 256);
  const weightT = wrapped(fixedT, 256);

  const texel = (x: number, y: number, channel: number) =>
    glint.data[
      (wrapped(y, GLINT_TEXTURE_SIZE) * GLINT_TEXTURE_SIZE +
        wrapped(x, GLINT_TEXTURE_SIZE)) *
        4 +
        channel
    ] ?? 0;

  return [0, 1, 2].map((channel) =>
    lerp(
      weightT,
      lerp(
        weightS,
        texel(column, row, channel),
        texel(column + 1, row, channel)
      ),
      lerp(
        weightS,
        texel(column, row + 1, channel),
        texel(column + 1, row + 1, channel)
      )
    )
  );
};

/**
 * Renders the nether star GUI item at GUI scale 2 and a glint time in
 * milliseconds (the value vanilla reads from Util.getMillis()). Returns
 * 32x32 straight RGBA: opaque item pixels, transparent elsewhere.
 */
export const renderNetherStar = (
  item: PngRgba,
  glint: PngRgba,
  glintMillis: number
) => {
  if (
    item.width !== SPRITE_SIZE ||
    item.height !== SPRITE_SIZE ||
    glint.width !== GLINT_TEXTURE_SIZE ||
    glint.height !== GLINT_TEXTURE_SIZE
  ) {
    throw new Error("Unexpected nether star or glint texture size");
  }

  const matrix = glintTextureMatrix(glintMillis);
  const [m00 = 0, m01 = 0] = matrix;
  const [m10 = 0, m11 = 0] = matrix.slice(4);
  const [m30 = 0, m31 = 0] = matrix.slice(12);

  // glint.vsh: (TextureMat * vec4(UV0, 0, 1)).xy.
  const vertex = (x: number, y: number, u: number, v: number): Vertex => ({
    s: f(f(f(m00 * u) + f(m10 * v)) + m30),
    t: f(f(f(m01 * u) + f(m11 * v)) + m31),
    x,
    y,
  });

  // The slot is the atlas's top-left 32x32: GL rows 480 to 511.
  const top = 512;
  const bottom = top - NETHER_STAR_SIZE;

  // The generated model's front quad, drawn as triangles (0, 1, 2) and
  // (2, 3, 0): top-left, bottom-left, bottom-right, top-right.
  const corners = [
    vertex(0, top, U0, V0),
    vertex(0, bottom, U0, V1),
    vertex(NETHER_STAR_SIZE, bottom, U1, V1),
    vertex(NETHER_STAR_SIZE, top, U1, V0),
  ] as const;

  const triangles = [
    [corners[0], corners[1], corners[2]],
    [corners[2], corners[3], corners[0]],
  ] as const;

  const planes = triangles.map(([a, b, c]) => ({
    s: plane(a, b, c, "s"),
    t: plane(a, b, c, "t"),
  }));

  const rgba = new Uint8ClampedArray(NETHER_STAR_SIZE * NETHER_STAR_SIZE * 4);

  for (let y = 0; y < NETHER_STAR_SIZE; y += 1) {
    for (let x = 0; x < NETHER_STAR_SIZE; x += 1) {
      const texel = (floorDiv(y, 2) * SPRITE_SIZE + floorDiv(x, 2)) * 4;

      const alpha = item.data[texel + 3] ?? 0;

      // ITEM_CUTOUT discards transparent texels; the slot stays clear. The
      // nether star texture has no partly transparent texel.
      if (alpha === 0) {
        continue;
      }

      if (alpha !== 255) {
        throw new Error("Partly transparent item texels are not supported");
      }

      const row = top - 1 - y;

      const index = triangles.findIndex(([a, b, c]) =>
        covers(a, b, c, x + 0.5, row + 0.5)
      );

      const triangle = planes[index];

      if (triangle === undefined) {
        throw new Error("Item pixel outside the quad");
      }

      const sample = sampleGlint(glint, triangle.s(x, row), triangle.t(x, row));

      const pixel = (y * NETHER_STAR_SIZE + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        // glint.fsh: rgb * (1 - fog) * GlintAlpha, with no fog in the atlas.
        const source = unorm8(
          f(unorm8ToFloat(sample[channel] ?? 0) * GLINT_ALPHA)
        );

        rgba[pixel + channel] = Math.min(
          255,
          (item.data[texel + channel] ?? 0) + mulNorm(source, source)
        );
      }

      rgba[pixel + 3] = 255;
    }
  }

  return rgba;
};
