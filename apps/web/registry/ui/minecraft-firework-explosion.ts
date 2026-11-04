// Minecraft Java Edition 26.2 firework explosion, ported from
// net.minecraft.client.particle.FireworkParticles (Starter, SparkParticle,
// OverlayParticle and their providers), SimpleAnimatedParticle,
// SingleQuadParticle, Particle and ParticleEngine, rendered as the
// projected reference scene renders them (ADR 0005): side-on orthographic
// projection, camera-facing quads, particle shader, fog and translucent
// blending.
//
// Java double arithmetic maps to JS numbers; float arithmetic is
// reproduced with Math.fround wherever the original rounds to float.
//
// oxlint-disable max-classes-per-file -- One class per vanilla particle class keeps the port line-for-line comparable with FireworkParticles.
import { decodePng } from "./minecraft-png";
import type { PngRgba } from "./minecraft-png";
import { LegacyRandomSource } from "./minecraft-random-source";

const f = Math.fround;

// A large_ball firework explosion without trail: the only kind ported.
export interface FireworkExplosionDefinition {
  colors: readonly number[];
  fadeColors: readonly number[];
  twinkle: boolean;
}

// DyeColor.getFireworkColor()
export const FIREWORK_DYE_COLORS = {
  green: 0x3b_51_1a,
  lime: 0x41_cd_34,
  white: 0xf0_f0_f0,
} as const;

// The firework explosion the header star button launches.
export const STAR_FIREWORK: FireworkExplosionDefinition = {
  colors: [FIREWORK_DYE_COLORS.lime, FIREWORK_DYE_COLORS.white],
  fadeColors: [FIREWORK_DYE_COLORS.green],
  twinkle: true,
};

/**
 * One sound the native client asks SoundManager for: the event, its sound
 * source (category) and the SoundInstance volume and pitch floats. Only the
 * near variants exist here (declared web adaptation: the listener is within
 * 10 blocks of the firework, so no _far variant and no distance delay).
 */
export interface FireworkSound {
  pitch: number;
  sound:
    | "entity.firework_rocket.large_blast"
    | "entity.firework_rocket.launch"
    | "entity.firework_rocket.twinkle";
  source: "AMBIENT";
  volume: number;
}

// One fixed particle seed for every launch (declared web adaptation): the
// n-th particle created draws RandomSource.create(seeds.nextLong()).
export const FIREWORK_SEED = 42n;

class ParticleSeeds {
  readonly #seeds: LegacyRandomSource;

  constructor(seed: bigint) {
    this.#seeds = new LegacyRandomSource(seed);
  }

  next() {
    return new LegacyRandomSource(this.#seeds.nextLong());
  }
}

type SpriteName =
  | "flash"
  | "spark_0"
  | "spark_1"
  | "spark_2"
  | "spark_3"
  | "spark_4"
  | "spark_5"
  | "spark_6"
  | "spark_7";

// particles/firework.json lists spark_7 first: SpriteSet.get(age, lifetime)
// walks from spark_7 to spark_0 over a spark's life.
const SPARK_SPRITES: readonly SpriteName[] = [
  "spark_7",
  "spark_6",
  "spark_5",
  "spark_4",
  "spark_3",
  "spark_2",
  "spark_1",
  "spark_0",
];

// Particle: position, motion and the bounding box movement integrates.
class Particle {
  x: number;
  y: number;
  z: number;
  xo: number;
  yo: number;
  zo: number;
  xd = 0;
  yd = 0;
  zd = 0;
  minX = 0;
  minY = 0;
  minZ = 0;
  maxX = 0;
  maxY = 0;
  maxZ = 0;
  readonly random: LegacyRandomSource;
  age = 0;
  lifetime: number;
  gravity = 0;
  friction = f(0.98);
  removed = false;
  readonly bbWidth = f(0.2);
  readonly bbHeight = f(0.2);

  constructor(seeds: ParticleSeeds, x: number, y: number, z: number) {
    this.random = seeds.next();
    this.x = x;
    this.y = y;
    this.z = z;

    // setPos(x, y, z)
    const halfWidth = f(this.bbWidth / 2);
    this.minX = x - halfWidth;
    this.minY = y;
    this.minZ = z - halfWidth;
    this.maxX = x + halfWidth;
    this.maxY = y + this.bbHeight;
    this.maxZ = z + halfWidth;

    this.xo = x;
    this.yo = y;
    this.zo = z;
    this.lifetime = Math.trunc(
      f(4 / f(f(this.random.nextFloat() * f(0.9)) + f(0.1)))
    );
  }

  tick() {
    this.xo = this.x;
    this.yo = this.y;
    this.zo = this.z;
    const { age } = this;
    this.age += 1;

    if (age >= this.lifetime) {
      this.removed = true;

      return;
    }

    this.yd -= 0.04 * this.gravity;
    this.move(this.xd, this.yd, this.zd);
    this.xd *= this.friction;
    this.yd *= this.friction;
    this.zd *= this.friction;
  }

  // Particle.move in open air: no collision changes the movement, so the
  // bounding box moves and the position follows its centre and floor.
  move(dx: number, dy: number, dz: number) {
    if (dx === 0 && dy === 0 && dz === 0) {
      return;
    }

    this.minX += dx;
    this.minY += dy;
    this.minZ += dz;
    this.maxX += dx;
    this.maxY += dy;
    this.maxZ += dz;
    this.x = (this.minX + this.maxX) / 2;
    this.y = this.minY;
    this.z = (this.minZ + this.maxZ) / 2;
  }
}

interface Quad {
  alpha: number;
  blue: number;
  green: number;
  red: number;
  size: number;
  sprite: SpriteName;
  x: number;
  y: number;
  z: number;
}

interface Camera {
  x: number;
  y: number;
  z: number;
}

// ARGB.as8BitChannel
const channel = (value: number) => Math.floor(f(value * 255));

// SingleQuadParticle
class QuadParticle extends Particle {
  quadSize: number;
  rCol = f(1);
  gCol = f(1);
  bCol = f(1);
  alpha = f(1);
  sprite: SpriteName;

  constructor(
    seeds: ParticleSeeds,
    x: number,
    y: number,
    z: number,
    sprite: SpriteName
  ) {
    super(seeds, x, y, z);
    this.sprite = sprite;
    this.quadSize = f(
      f(f(0.1) * f(f(this.random.nextFloat() * f(0.5)) + f(0.5))) * 2
    );
  }

  quadSizeAt(_partialTick: number) {
    return this.quadSize;
  }

  // extractRotatedQuad: camera-relative position, interpolated by partialTick.
  extract(camera: Camera, partialTick: number): Quad | undefined {
    return {
      alpha: channel(this.alpha),
      blue: channel(this.bCol),
      green: channel(this.gCol),
      red: channel(this.rCol),
      size: this.quadSizeAt(partialTick),
      sprite: this.sprite,
      x: f(this.xo + partialTick * (this.x - this.xo) - camera.x),
      y: f(this.yo + partialTick * (this.y - this.yo) - camera.y),
      z: f(this.zo + partialTick * (this.z - this.zo) - camera.z),
    };
  }
}

// FireworkParticles.SparkParticle (a SimpleAnimatedParticle)
class Spark extends QuadParticle {
  fadeR = 0;
  fadeG = 0;
  fadeB = 0;
  hasFade = false;
  twinkle = false;

  constructor(
    seeds: ParticleSeeds,
    position: readonly [number, number, number],
    motion: readonly [number, number, number]
  ) {
    super(seeds, position[0], position[1], position[2], "spark_7");
    this.friction = f(0.91);
    this.gravity = f(0.1);
    [this.xd, this.yd, this.zd] = motion;
    this.quadSize = f(this.quadSize * f(0.75));
    this.lifetime = 48 + this.random.nextInt(12);
    this.setSpriteFromAge();
  }

  setSpriteFromAge() {
    if (!this.removed) {
      const index = Math.trunc(
        (this.age * (SPARK_SPRITES.length - 1)) / this.lifetime
      );

      this.sprite = SPARK_SPRITES[index] ?? "spark_0";
    }
  }

  setColor(color: number) {
    this.rCol = f((Math.trunc(color / 0x1_00_00) % 256) / 255);
    this.gCol = f((Math.trunc(color / 0x1_00) % 256) / 255);
    this.bCol = f((color % 256) / 255);
  }

  setFadeColor(color: number) {
    this.fadeR = f((Math.trunc(color / 0x1_00_00) % 256) / 255);
    this.fadeG = f((Math.trunc(color / 0x1_00) % 256) / 255);
    this.fadeB = f((color % 256) / 255);
    this.hasFade = true;
  }

  override tick() {
    super.tick();
    this.setSpriteFromAge();
    const half = Math.trunc(this.lifetime / 2);

    if (this.age > half) {
      this.alpha = f(1 - f(f(this.age - half) / this.lifetime));

      if (this.hasFade) {
        this.rCol = f(this.rCol + f(f(this.fadeR - this.rCol) * f(0.2)));
        this.gCol = f(this.gCol + f(f(this.fadeG - this.gCol) * f(0.2)));
        this.bCol = f(this.bCol + f(f(this.fadeB - this.bCol) * f(0.2)));
      }
    }
  }

  override extract(camera: Camera, partialTick: number): Quad | undefined {
    const third = Math.trunc(this.lifetime / 3);

    // Twinkling sparks skip every other third of a second late in life.
    const hidden =
      this.twinkle &&
      this.age >= third &&
      Math.trunc((this.age + this.lifetime) / 3) % 2 !== 0;

    return hidden ? undefined : super.extract(camera, partialTick);
  }
}

// Mth.sin: a 65536-entry float table of Math.sin.
const SIN_SCALE = 10_430.378350470453;

const mthSin = (value: number) => {
  const index = ((Math.trunc(value * SIN_SCALE) % 65_536) + 65_536) % 65_536;

  return f(Math.sin(index / SIN_SCALE));
};

// FireworkParticles.OverlayParticle: the explosion flash.
class Flash extends QuadParticle {
  constructor(
    seeds: ParticleSeeds,
    position: readonly [number, number, number],
    color: number
  ) {
    super(seeds, position[0], position[1], position[2], "flash");
    this.lifetime = 4;
    this.rCol = f((Math.trunc(color / 0x1_00_00) % 256) / 255);
    this.gCol = f((Math.trunc(color / 0x1_00) % 256) / 255);
    this.bCol = f((color % 256) / 255);
  }

  override quadSizeAt(partialTick: number) {
    const phase = f(f(f(f(this.age + partialTick) - 1) * f(0.25)) * f(Math.PI));

    return f(f(7.1) * mthSin(phase));
  }

  override extract(camera: Camera, partialTick: number) {
    this.alpha = f(
      f(0.6) - f(f(f(f(this.age + partialTick) - 1) * f(0.25)) * f(0.5))
    );

    return super.extract(camera, partialTick);
  }
}

// FireworkParticles.Starter: no quad of its own; it creates the explosion.
class Starter extends Particle {
  life = 0;
  readonly #explosion: FireworkExplosionDefinition;
  readonly #seeds: ParticleSeeds;
  readonly #spawn: (particle: QuadParticle) => void;
  readonly #play: (sound: FireworkSound) => void;

  constructor(
    seeds: ParticleSeeds,
    position: readonly [number, number, number],
    explosion: FireworkExplosionDefinition,
    spawn: (particle: QuadParticle) => void,
    play: (sound: FireworkSound) => void
  ) {
    super(seeds, position[0], position[1], position[2]);
    this.#seeds = seeds;
    this.#explosion = explosion;
    this.#spawn = spawn;
    this.#play = play;
    // One explosion: lifetime 2n - 1, plus 15 ticks of twinkle delay.
    this.lifetime = 1 + (explosion.twinkle ? 15 : 0);
  }

  override tick() {
    if (this.life === 0) {
      // ClientLevel.playLocalSound(..., AMBIENT, 20.0F, 0.95F +
      // random.nextFloat() * 0.1F, true). The starter selects large_blast
      // for a large ball, the only shape ported.
      this.#play({
        pitch: f(f(0.95) + f(this.random.nextFloat() * f(0.1))),
        sound: "entity.firework_rocket.large_blast",
        source: "AMBIENT",
        volume: 20,
      });
      this.createParticleBall(0.5, 4);
      this.#spawn(
        new Flash(
          this.#seeds,
          [this.x, this.y, this.z],
          this.#explosion.colors[0] ?? 0
        )
      );
    }

    this.life += 1;

    if (this.life > this.lifetime) {
      if (this.#explosion.twinkle) {
        // ClientLevel.playLocalSound(..., AMBIENT, 20.0F, 0.9F +
        // random.nextFloat() * 0.15F, true).
        this.#play({
          pitch: f(f(0.9) + f(this.random.nextFloat() * f(0.15))),
          sound: "entity.firework_rocket.twinkle",
          source: "AMBIENT",
          volume: 20,
        });
      }

      this.removed = true;
    }
  }

  createParticleBall(speed: number, size: number) {
    const { random } = this;

    for (let a = -size; a <= size; a += 1) {
      for (let b = -size; b <= size; b += 1) {
        for (let c = -size; c <= size; c += 1) {
          const dx = b + (random.nextDouble() - random.nextDouble()) * 0.5;
          const dy = a + (random.nextDouble() - random.nextDouble()) * 0.5;
          const dz = c + (random.nextDouble() - random.nextDouble()) * 0.5;

          const length =
            // oxlint-disable-next-line unicorn/prefer-modern-math-apis -- Java's Math.sqrt of the sum; Math.hypot rounds differently.
            Math.sqrt(dx * dx + dy * dy + dz * dz) / speed +
            random.nextGaussian() * 0.05;

          const spark = new Spark(
            this.#seeds,
            [this.x, this.y, this.z],
            [dx / length, dy / length, dz / length]
          );

          spark.twinkle = this.#explosion.twinkle;
          spark.alpha = f(0.99);
          const { colors, fadeColors } = this.#explosion;
          spark.setColor(colors[random.nextInt(colors.length)] ?? 0);

          if (fadeColors.length > 0) {
            spark.setFadeColor(
              fadeColors[random.nextInt(fadeColors.length)] ?? 0
            );
          }

          this.#spawn(spark);

          // Only the shell of the cube: jump over its interior.
          if (a !== -size && a !== size && b !== -size && b !== size) {
            c += size * 2 - 1;
          }
        }
      }
    }
  }
}

/**
 * The client particle engine for firework particles: ParticleEngine.tick
 * ticks live particles, then adds the particles created since, in order.
 * Every particle created draws its random source from one seed stream.
 */
export class FireworkParticleEngine {
  readonly #seeds: ParticleSeeds;
  readonly #quads: QuadParticle[] = [];
  #starters: Starter[] = [];
  #pending: (QuadParticle | Starter)[] = [];
  #sounds: FireworkSound[] = [];

  constructor(seed: bigint = FIREWORK_SEED) {
    this.#seeds = new ParticleSeeds(seed);
  }

  get empty() {
    return (
      this.#quads.length === 0 &&
      this.#starters.length === 0 &&
      this.#pending.length === 0
    );
  }

  // ClientLevel.createFireworks queues the starter.
  createFireworks(
    position: readonly [number, number, number],
    explosion: FireworkExplosionDefinition = STAR_FIREWORK
  ) {
    this.#pending.push(
      new Starter(
        this.#seeds,
        position,
        explosion,
        (particle) => {
          this.#pending.push(particle);
        },
        (sound) => {
          this.#sounds.push(sound);
        }
      )
    );
  }

  // ParticleTypes.FIREWORK through SparkProvider: a white spark at alpha 0.99.
  createSpark(
    position: readonly [number, number, number],
    motion: readonly [number, number, number]
  ) {
    const spark = new Spark(this.#seeds, position, motion);
    spark.alpha = f(0.99);
    this.#pending.push(spark);
  }

  /** One tick; returns the sounds the starters asked for in it. */
  tick(): readonly FireworkSound[] {
    this.#sounds = [];

    for (const particle of [...this.#starters, ...this.#quads]) {
      particle.tick();
    }

    this.#starters = this.#starters.filter((particle) => !particle.removed);
    const live = this.#quads.filter((particle) => !particle.removed);
    this.#quads.length = 0;
    this.#quads.push(...live);

    const added = this.#pending;
    this.#pending = [];

    for (const particle of added) {
      if (particle instanceof Starter) {
        this.#starters.push(particle);
      } else {
        this.#quads.push(particle);
      }
    }

    return this.#sounds;
  }

  quads(camera: Camera, partialTick: number) {
    return this.#quads.flatMap((particle) => {
      const quad = particle.extract(camera, partialTick);

      return quad === undefined ? [] : [quad];
    });
  }
}

/** One explosion started through ClientLevel.createFireworks at rest. */
export class FireworkExplosionSimulation {
  readonly #engine: FireworkParticleEngine;
  ticks = 0;

  constructor(
    position: readonly [number, number, number],
    explosion: FireworkExplosionDefinition = STAR_FIREWORK,
    seed: bigint = FIREWORK_SEED
  ) {
    this.#engine = new FireworkParticleEngine(seed);
    this.#engine.createFireworks(position, explosion);
  }

  get done() {
    return this.ticks > 0 && this.#engine.empty;
  }

  /** One tick; returns the sounds asked for in it. */
  tick() {
    this.ticks += 1;

    return this.#engine.tick();
  }

  quads(camera: Camera, partialTick: number) {
    return this.#engine.quads(camera, partialTick);
  }
}

// --- Rendering --------------------------------------------------------------

export interface FireworkScene {
  camera: Camera;
  // Window pixel (from the left, from the top) the camera eye projects to;
  // the window centre when absent.
  eyeAt?: readonly [number, number];
  height: number;
  pixelsPerBlock: number;
  width: number;
}

export type FireworkSprites = Record<SpriteName, PngRgba>;

export const loadFireworkSprites = async (textures: {
  flash: string;
  spark: readonly string[];
}): Promise<FireworkSprites> => {
  const [flash, ...sparks] = await Promise.all([
    decodePng(textures.flash),
    ...textures.spark.map(async (uri) => await decodePng(uri)),
  ]);

  if (flash === undefined || sparks.length !== 8) {
    throw new Error("Firework sprites are incomplete");
  }

  const spark = (index: number) => {
    const sprite = sparks[index];

    if (sprite === undefined) {
      throw new Error(`Firework sprite spark_${index} is missing`);
    }

    return sprite;
  };

  return {
    flash,
    spark_0: spark(0),
    spark_1: spark(1),
    spark_2: spark(2),
    spark_3: spark(3),
    spark_4: spark(4),
    spark_5: spark(5),
    spark_6: spark(6),
    spark_7: spark(7),
  };
};

// Atmospheric fog at noon (FogRenderer): linear from 0 to 1024 blocks
// towards the sky colour.
const FOG_COLOR = [f(181 / 255), f(208 / 255), f(1)] as const;
const FOG_END = f(1024);

// The vanilla 26.2 particle atlas (512x256, one mip level, nearest
// sampling, clamped): each firework sprite's texel origin, inside its
// one-texel padding.
const ATLAS_WIDTH = 512;
const ATLAS_HEIGHT = 256;

const ATLAS: Record<SpriteName, readonly [number, number]> = {
  flash: [69, 129],
  spark_0: [413, 81],
  spark_1: [413, 91],
  spark_2: [413, 101],
  spark_3: [413, 111],
  spark_4: [413, 121],
  spark_5: [413, 131],
  spark_6: [413, 141],
  spark_7: [413, 151],
};

// Float to unorm8 as llvmpipe converts it: scale by 255/256 in float, then
// add 2^15 so float rounding (to nearest, ties to even) leaves the byte in
// the low mantissa bits.
const UNORM8_SCALE = f(255 / 256);
const UNORM8_BIAS = 32_768;

export const unorm8 = (value: number) => {
  const biased = f(
    f(Math.min(1, Math.max(0, value)) * UNORM8_SCALE) + UNORM8_BIAS
  );

  return Math.round((biased - UNORM8_BIAS) * 256);
};

// Unorm8 to float as llvmpipe converts vertex attributes and texels: the
// integer becomes a float and is multiplied by the float constant 1/255.
// That is not the correctly rounded byte / 255: it differs by one ulp for
// about half of the bytes (240 among them), which decides fogged colours that
// fall on a rounding tie.
const UNORM8_TO_FLOAT = f(1 / 255);

export const unorm8ToFloat = (byte: number) => f(byte * UNORM8_TO_FLOAT);

// apply_fog: linear atmospheric fog by the interpolated vertex distance.
export const fogComponent = (
  source: number,
  component: number,
  distance: number
) => {
  const fog = f(distance / FOG_END);

  return f(source + f(f(f(FOG_COLOR[component] ?? 0) - source) * fog));
};

// Normalised 8-bit multiply a * b / 255 as llvmpipe approximates it:
// (ab + (ab >> 8) + 0x80) >> 8. It is not always the correctly rounded
// quotient (253 * 191 gives 189, not 190).
const mulNorm = (a: number, b: number) => {
  const product = a * b;

  return Math.floor((product + Math.floor(product / 256) + 128) / 256);
};

// particle.fsh discards fragments below this alpha.
const ALPHA_CUTOFF = f(0.1);

// The rasterizer snaps window coordinates to 1/256 pixel.
const SUBPIXEL = 256;

const snap = (value: number) => {
  const scaled = value * SUBPIXEL;
  const rounded = Math.round(scaled);

  // Round half to even, as lrint does.
  return rounded - scaled === 0.5 && rounded % 2 !== 0 ? rounded - 1 : rounded;
};

export interface Vertex {
  // Camera-relative distance for the fog, per vertex.
  distance: number;
  u: number;
  v: number;
  // GL window coordinates (origin bottom-left).
  x: number;
  y: number;
}

// Triangle setup as llvmpipe evaluates it: one plane per attribute and
// triangle, a(x, y) = a0 + dadx x + dady y at integer pixel coordinates
// (centres at +0.5), with multiply-adds fused. The float product is exact
// in double, so f(a * b + c) rounds once like a fused multiply-add.
const plane = (
  a: Vertex,
  b: Vertex,
  c: Vertex,
  key: "distance" | "u" | "v"
) => {
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

/** A colour target with its depth buffer, for one scene. */
export interface FireworkTarget {
  color: Uint8ClampedArray;
  depth: Float32Array;
  scene: FireworkScene;
}

/**
 * A cleared target. Pass the native backdrop colour to composite over it
 * exactly; without one the backdrop stays transparent (a declared web
 * adaptation).
 */
export const createFireworkTarget = (
  scene: FireworkScene,
  backdrop?: readonly [number, number, number]
): FireworkTarget => {
  const { height, width } = scene;
  const color = new Uint8ClampedArray(width * height * 4);

  if (backdrop !== undefined) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      color.set([backdrop[0], backdrop[1], backdrop[2], 255], pixel * 4);
    }
  }

  return {
    color,
    depth: new Float32Array(width * height).fill(-Infinity),
    scene,
  };
};

/**
 * Camera-relative position to window coordinates: Matrix4f.setOrtho for
 * the declared projection, then the viewport transform. The fog distance is
 * the vertex's camera-relative length.
 */
export const projectVertex = (scene: FireworkScene) => {
  const { height, pixelsPerBlock, width } = scene;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const [eyeX, eyeY] = scene.eyeAt ?? [halfWidth, halfHeight];
  const left = f(-eyeX / pixelsPerBlock);
  const right = f(f(width - eyeX) / pixelsPerBlock);
  const bottom = -f(f(height - eyeY) / pixelsPerBlock);
  const top = f(eyeY / pixelsPerBlock);
  const scaleX = f(2 / f(right - left));
  const scaleY = f(2 / f(top - bottom));
  const offsetX = f(f(right + left) / f(left - right));
  const offsetY = f(f(top + bottom) / f(bottom - top));

  return (x: number, y: number, z: number, u: number, v: number): Vertex => ({
    distance: f(Math.sqrt(f(f(f(x * x) + f(y * y)) + f(z * z)))),
    u,
    v,
    x: f(f(f(f(scaleX * x) + offsetX) * halfWidth) + halfWidth),
    y: f(f(f(f(scaleY * y) + offsetY) * halfHeight) + halfHeight),
  });
};

/**
 * Rasterizes one triangle as llvmpipe does and calls `shade` for every
 * covered pixel (stored top-down) with the interpolated attributes.
 */
export const rasterizeTriangle = (
  target: FireworkTarget,
  a: Vertex,
  b: Vertex,
  c: Vertex,
  shade: (pixel: number, u: number, v: number, distance: number) => void
) => {
  const { height, width } = target.scene;
  const pa = [snap(a.x), snap(a.y)] as const;
  const pb = [snap(b.x), snap(b.y)] as const;
  const pc = [snap(c.x), snap(c.y)] as const;

  const area =
    (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);

  if (area === 0) {
    return;
  }

  const sign = area > 0 ? 1 : -1;

  // A tuple of edges keeps both ends defined under noUncheckedIndexedAccess.
  const edges = (
    [
      [pa, pb],
      [pb, pc],
      [pc, pa],
    ] as const
  ).map(([from, to]) => {
    const [fromX, fromY] = from;
    const [toX, toY] = to;
    const dx = (toX - fromX) * sign;
    const dy = (toY - fromY) * sign;
    // Fill rule: pixel centres on a left edge, or on a bottom edge in GL
    // window coordinates (the top edge of the stored frame), are inside.
    const inclusive = dy < 0 || (dy === 0 && dx > 0);

    return { dx, dy, fromX, fromY, inclusive };
  });

  const minX = Math.max(
    0,
    Math.floor(Math.min(pa[0], pb[0], pc[0]) / SUBPIXEL) - 1
  );

  const maxX = Math.min(
    width - 1,
    Math.ceil(Math.max(pa[0], pb[0], pc[0]) / SUBPIXEL) + 1
  );

  const minY = Math.max(
    0,
    Math.floor(Math.min(pa[1], pb[1], pc[1]) / SUBPIXEL) - 1
  );

  const maxY = Math.min(
    height - 1,
    Math.ceil(Math.max(pa[1], pb[1], pc[1]) / SUBPIXEL) + 1
  );

  const u = plane(a, b, c, "u");
  const v = plane(a, b, c, "v");
  const distance = plane(a, b, c, "distance");

  for (let row = minY; row <= maxY; row += 1) {
    const centerY = row * SUBPIXEL + SUBPIXEL / 2;

    for (let column = minX; column <= maxX; column += 1) {
      const centerX = column * SUBPIXEL + SUBPIXEL / 2;

      const inside = edges.every(({ dx, dy, fromX, fromY, inclusive }) => {
        const value = dx * (centerY - fromY) - dy * (centerX - fromX);

        return value > 0 || (value === 0 && inclusive);
      });

      if (inside) {
        // Rows count from the bottom in GL; the frame is stored top-down.
        shade(
          (height - 1 - row) * width + column,
          u(column, row),
          v(column, row),
          distance(column, row)
        );
      }
    }
  }
};

/**
 * Draws the camera-facing quads into the target in particle order, with the
 * TRANSLUCENT blend function and the depth test of the scene.
 */
export const drawFireworkQuads = (
  target: FireworkTarget,
  quads: readonly Quad[],
  sprites: FireworkSprites
) => {
  const { color, depth } = target;
  const vertex = projectVertex(target.scene);

  for (const quad of quads) {
    const sprite = sprites[quad.sprite];
    const [originX, originY] = ATLAS[quad.sprite];
    const u0 = f(originX / ATLAS_WIDTH);
    const u1 = f((originX + sprite.width) / ATLAS_WIDTH);
    const v0 = f(originY / ATLAS_HEIGHT);
    const v1 = f((originY + sprite.height) / ATLAS_HEIGHT);
    const right = f(quad.x + quad.size);
    const left = f(quad.x - quad.size);
    const up = f(quad.y + quad.size);
    const down = f(quad.y - quad.size);
    const vertexAlpha = unorm8ToFloat(quad.alpha);
    const fragmentDepth = -quad.z;

    const shade = (pixel: number, u: number, v: number, distance: number) => {
      const texelX = Math.min(
        sprite.width - 1,
        Math.max(0, Math.floor(f(u * ATLAS_WIDTH)) - originX)
      );

      const texelY = Math.min(
        sprite.height - 1,
        Math.max(0, Math.floor(f(v * ATLAS_HEIGHT)) - originY)
      );

      const texel = (texelY * sprite.width + texelX) * 4;

      const alpha = f(unorm8ToFloat(sprite.data[texel + 3] ?? 0) * vertexAlpha);

      if (alpha < ALPHA_CUTOFF) {
        return;
      }

      // DepthStencilState.DEFAULT: GREATER_THAN_OR_EQUAL with depth writes.
      // Under the declared projection the farther fragment has the larger
      // depth, so it passes.
      if (fragmentDepth < (depth[pixel] ?? 0)) {
        return;
      }

      depth[pixel] = fragmentDepth;
      const sourceAlpha = unorm8(alpha);

      // The unorm8 target blends in 8-bit fixed point: source colour and
      // alpha are converted to bytes, then multiplied with rounding.
      for (let component = 0; component < 3; component += 1) {
        const source = f(
          unorm8ToFloat(sprite.data[texel + component] ?? 0) *
            unorm8ToFloat([quad.red, quad.green, quad.blue][component] ?? 0)
        );

        const offset = pixel * 4 + component;
        color[offset] = Math.min(
          255,
          mulNorm(
            unorm8(fogComponent(source, component, distance)),
            sourceAlpha
          ) + mulNorm(color[offset] ?? 0, 255 - sourceAlpha)
        );
      }

      color[pixel * 4 + 3] = Math.min(
        255,
        sourceAlpha + mulNorm(color[pixel * 4 + 3] ?? 0, 255 - sourceAlpha)
      );
    };

    // QuadParticleRenderState.renderRotatedQuad corner order, drawn as the
    // triangles (0, 1, 2) and (2, 3, 0).
    const corners = [
      vertex(right, down, quad.z, u1, v1),
      vertex(right, up, quad.z, u1, v0),
      vertex(left, up, quad.z, u0, v0),
      vertex(left, down, quad.z, u0, v1),
    ] as const;

    rasterizeTriangle(target, corners[0], corners[1], corners[2], shade);
    rasterizeTriangle(target, corners[2], corners[3], corners[0], shade);
  }
};

/**
 * Renders the camera-facing quads into straight RGBA, drawn in particle
 * order with the TRANSLUCENT blend function and the depth test of the
 * scene. Pass the native backdrop colour to composite over it exactly;
 * without one the backdrop stays transparent (a declared web adaptation).
 */
export const renderFireworkQuads = (
  quads: readonly Quad[],
  scene: FireworkScene,
  sprites: FireworkSprites,
  backdrop?: readonly [number, number, number]
) => {
  const target = createFireworkTarget(scene, backdrop);
  drawFireworkQuads(target, quads, sprites);

  return target.color;
};

// The projected reference scene (ADR 0005, case in
// packages/pixel-perfect/tests/reference/fireworks): a 480x640 window at 16
// window pixels per block, the side-on camera facing north 15 blocks from
// the explosion. The camera eye is the declared (0.5, 80.5, 0.5) after
// vanilla eye-height settling, as the native capture records it.
export const FIREWORK_SCENE: FireworkScene = {
  camera: { x: 0.5, y: 80.49999988079071, z: 0.5 },
  height: 640,
  pixelsPerBlock: 16,
  width: 480,
};

export const FIREWORK_ORIGIN = [0.5, 80.5, -14.5] as const;

/**
 * The explosion after `tick` client ticks since it started, at
 * `partialTick` between ticks, as straight RGBA for the whole scene.
 */
export const renderFireworkExplosionFrame = (
  sprites: FireworkSprites,
  tick: number,
  options: {
    backdrop?: readonly [number, number, number];
    partialTick?: number;
  } = {}
) => {
  const simulation = new FireworkExplosionSimulation(FIREWORK_ORIGIN);

  for (let step = 0; step < tick; step += 1) {
    simulation.tick();
  }

  return renderFireworkQuads(
    simulation.quads(FIREWORK_SCENE.camera, options.partialTick ?? 0),
    FIREWORK_SCENE,
    sprites,
    options.backdrop
  );
};
