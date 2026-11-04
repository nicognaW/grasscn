// Minecraft Java Edition 26.2 random source, ported from
// net.minecraft.world.level.levelgen.LegacyRandomSource (what
// RandomSource.create(seed) returns), its BitRandomSource defaults and
// MarsagliaPolarGaussian.
//
// The 48-bit linear congruential state is held in a BigInt; Java's int,
// long and float arithmetic is reproduced with BigInt.asIntN and
// Math.fround where the original narrows.

const MULTIPLIER = 0x5_de_ec_e6_6dn;
const INCREMENT = 0xbn;
const INT_MAX = 2_147_483_647;
const MODULUS_BITS = 48;

// BitRandomSource.FLOAT_MULTIPLIER and DOUBLE_MULTIPLIER
const FLOAT_MULTIPLIER = Math.fround(5.9604645e-8);
const DOUBLE_MULTIPLIER = 1.1102230246251565e-16;

export class LegacyRandomSource {
  #seed = 0n;
  #nextNextGaussian = 0;
  #haveNextNextGaussian = false;

  constructor(seed: bigint) {
    this.setSeed(seed);
  }

  setSeed(seed: bigint) {
    // oxlint-disable-next-line no-bitwise -- Java scrambles the seed with XOR.
    const scrambled = BigInt.asIntN(64, seed) ^ MULTIPLIER;
    this.#seed = BigInt.asUintN(MODULUS_BITS, scrambled);
    this.#haveNextNextGaussian = false;
  }

  next(bits: number) {
    this.#seed = BigInt.asUintN(
      MODULUS_BITS,
      this.#seed * MULTIPLIER + INCREMENT
    );

    // (int) (seed >>> (48 - bits)); the state is non-negative.
    return Number(
      BigInt.asIntN(32, this.#seed / 2n ** BigInt(MODULUS_BITS - bits))
    );
  }

  nextInt(bound?: number) {
    if (bound === undefined) {
      return this.next(32);
    }

    if (!Number.isInteger(bound) || bound <= 0) {
      throw new Error("Bound must be positive");
    }

    if (Number.isInteger(Math.log2(bound))) {
      // Power-of-two bounds: (int) ((long) bound * next(31) >> 31).
      return Number((BigInt(bound) * BigInt(this.next(31))) / 2n ** 31n);
    }

    for (;;) {
      const bits = this.next(31);
      const value = bits % bound;

      // Java retries while the int sum bits - value + (bound - 1) overflows.
      if (bits - value + (bound - 1) <= INT_MAX) {
        return value;
      }
    }
  }

  nextLong() {
    const high = this.next(32);
    const low = this.next(32);

    // ((long) high << 32) + low
    return BigInt.asIntN(64, BigInt(high) * 2n ** 32n + BigInt(low));
  }

  nextBoolean() {
    return this.next(1) !== 0;
  }

  nextFloat() {
    return Math.fround(this.next(24) * FLOAT_MULTIPLIER);
  }

  nextDouble() {
    const high = this.next(26);
    const low = this.next(27);

    return (high * 2 ** 27 + low) * DOUBLE_MULTIPLIER;
  }

  // MarsagliaPolarGaussian.nextGaussian
  nextGaussian() {
    if (this.#haveNextNextGaussian) {
      this.#haveNextNextGaussian = false;

      return this.#nextNextGaussian;
    }

    for (;;) {
      const first = 2 * this.nextDouble() - 1;
      const second = 2 * this.nextDouble() - 1;
      const square = first * first + second * second;

      if (square < 1 && square !== 0) {
        const scale = Math.sqrt((-2 * Math.log(square)) / square);
        this.#nextNextGaussian = second * scale;
        this.#haveNextNextGaussian = true;

        return first * scale;
      }
    }
  }
}
