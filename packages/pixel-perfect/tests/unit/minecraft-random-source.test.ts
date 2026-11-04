// The ported random source must reproduce the native 26.2
// RandomSource.create(seed) sequences at the fixtures' fixed seed. The
// expected values were recorded inside the native capture launches
// (ProjectedReferenceMain.randomSequences), not computed here.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LegacyRandomSource } from "@grasscn/web/ui/minecraft-random-source";

import { randomSequencesSchema } from "../../src/native/projected-firework-case";
import { pixelPerfectFile } from "../../src/paths";

const native = randomSequencesSchema.parse(
  JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/fireworks/random-sequences.json"),
      "utf-8"
    )
  )
);

const seed = BigInt(native.seed);

const floatBits = (value: number) => {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);

  return view.getInt32(0);
};

const doubleBits = (value: number) => {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);

  return view.getBigUint64(0).toString(16);
};

const draw = <T>(count: number, next: () => T) =>
  Array.from({ length: count }, next);

test("the ported random source reproduces native nextInt", () => {
  const random = new LegacyRandomSource(seed);

  assert.deepEqual(
    draw(native.nextInt.length, () => random.nextInt()),
    native.nextInt
  );
});

test("the ported random source reproduces native bounded nextInt", () => {
  for (const [bound, expected] of Object.entries(native.nextIntBounded)) {
    const random = new LegacyRandomSource(seed);

    assert.deepEqual(
      draw(expected.length, () => random.nextInt(Number(bound))),
      expected,
      `nextInt(${bound})`
    );
  }
});

test("the ported random source reproduces native nextLong", () => {
  const random = new LegacyRandomSource(seed);

  assert.deepEqual(
    draw(native.nextLong.length, () => random.nextLong().toString()),
    native.nextLong
  );
});

test("the ported random source reproduces native nextFloat, nextDouble and nextBoolean bit for bit", () => {
  const floats = new LegacyRandomSource(seed);
  const doubles = new LegacyRandomSource(seed);
  const booleans = new LegacyRandomSource(seed);

  assert.deepEqual(
    draw(native.nextFloatBits.length, () => floatBits(floats.nextFloat())),
    native.nextFloatBits
  );
  assert.deepEqual(
    draw(native.nextDoubleBits.length, () => doubleBits(doubles.nextDouble())),
    native.nextDoubleBits
  );
  assert.deepEqual(
    draw(native.nextBoolean.length, () => booleans.nextBoolean()),
    native.nextBoolean
  );
});

test("the ported random source reproduces native nextGaussian bit for bit", () => {
  const random = new LegacyRandomSource(seed);

  assert.deepEqual(
    draw(native.nextGaussianBits.length, () =>
      doubleBits(random.nextGaussian())
    ),
    native.nextGaussianBits
  );
});

test("the ported random source reproduces native interleaved draws", () => {
  const random = new LegacyRandomSource(seed);

  const drawn = native.interleaved.map((entry) => {
    switch (entry[0]) {
      case "d": {
        return `d:${doubleBits(random.nextDouble())}`;
      }

      case "g": {
        return `g:${doubleBits(random.nextGaussian())}`;
      }

      case "i": {
        return `i:${random.nextInt(2)}`;
      }

      default: {
        return `f:${floatBits(random.nextFloat())}`;
      }
    }
  });

  assert.deepEqual(drawn, native.interleaved);
});
