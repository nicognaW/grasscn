// Declarations shared by the projected firework capture and its Pixel
// Perfect Tests (ADR 0005): one firework explosion in a fixed side-on
// orthographic scene, captured at every client tick at partialTick 0.
import { z } from "zod";

import { boundsSchema, imageIdentitySchema, vector3 } from "./projected-case";

const dyeColor = z.enum([
  "white",
  "orange",
  "magenta",
  "light_blue",
  "yellow",
  "lime",
  "pink",
  "gray",
  "light_gray",
  "cyan",
  "purple",
  "blue",
  "brown",
  "green",
  "red",
  "black",
]);

export const projectedFireworkCaseSchema = z.object({
  camera: z.object({
    // Camera eye position in world coordinates; the view is side-on.
    eye: vector3,
    xRot: z.number(),
    yRot: z.number(),
  }),
  component: z.string(),
  firework: z.object({
    // The explosion starts here through ClientLevel.createFireworks.
    at: vector3,
    explosion: z.object({
      colors: z.array(dyeColor).min(1),
      fadeColors: z.array(dyeColor),
      // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Minecraft's FireworkExplosion.shape, as the harness reads it.
      shape: z.enum(["small_ball", "large_ball", "star", "creeper", "burst"]),
      trail: z.boolean(),
      twinkle: z.boolean(),
    }),
    // Upper bound for the capture loop; the explosion must end before it.
    maxTicks: z.number().int().positive(),
    name: z.string().regex(/^[a-z0-9-]+$/u),
    // Seed of the vanilla LegacyRandomSource that seeds every particle.
    seed: z.number().int(),
  }),
  minecraftVersion: z.literal("26.2"),
  projection: z.object({
    facing: z.literal("north"),
    pixelsPerBlock: z.number().int().positive(),
    type: z.literal("orthographic"),
    zFar: z.number().positive(),
    zNear: z.number().positive(),
  }),
  sentinel: z.object({
    // A window pixel off every frame's geometry that must show the open sky.
    at: z.tuple([z.number().int(), z.number().int()]),
    description: z.string(),
  }),
  ticksPerSecond: z.literal(20),
  window: z.object({
    height: z.number().int().positive(),
    width: z.number().int().positive(),
  }),
  world: z.object({
    clockTime: z.number().int(),
    commands: z.array(z.string()),
    description: z.string(),
    levelName: z.string(),
    preset: z.literal("minecraft:flat"),
    seed: z.number().int(),
  }),
});

export type ProjectedFireworkCase = z.infer<typeof projectedFireworkCaseSchema>;

export const projectedFireworkManifestSchema = z.object({
  backdropFrame: imageIdentitySchema,
  caseDefinitionSha256: z.string().length(64),
  differenceTolerance: z.literal(0),
  // Frames that showed no particle pixel (identical to the backdrop).
  emptyTicks: z.array(z.number().int()),
  explosion: z.object({
    colors: z.array(z.number().int()),
    fadeColors: z.array(z.number().int()),
  }),
  frames: z.array(
    z.object({
      bounds: boundsSchema,
      coveredPixels: z.number().int().positive(),
      mask: imageIdentitySchema,
      name: z.string(),
      reference: imageIdentitySchema,
      sceneFrame: imageIdentitySchema,
      sentinel: z.object({
        at: z.tuple([z.number().int(), z.number().int()]),
        rgba: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      }),
      tick: z.number().int().positive(),
    })
  ),
  harnessSources: z.array(
    z.object({ file: z.string(), sha256: z.string().length(64) })
  ),
  launches: z.array(z.object({ name: z.string(), runtime: z.unknown() })),
  minecraftVersion: z.literal("26.2"),
  mods: z.array(z.string()).length(0),
  // Native camera eye at the backdrop frame (the declared eye after vanilla
  // eye-height settling).
  nativeCamera: z.object({
    position: vector3,
    rotation: z.tuple([z.number(), z.number()]),
  }),
  partialTick: z.literal(0),
  projection: z.unknown(),
  randomSequences: z.object({
    file: z.string(),
    sha256: z.string().length(64),
  }),
  repeatDecodedRgbaEqual: z.literal(true),
  resourcePacks: z.array(z.string()).length(0),
  scene: z.unknown(),
  scope: z.string(),
  seed: z.number().int(),
  seededParticles: z.number().int().positive(),
  sourceJar: z.object({ path: z.string(), sha256: z.string().length(64) }),
  tickRange: z.object({
    // Client ticks since ClientLevel.createFireworks; the last tick is the
    // first with no live particle.
    first: z.number().int().positive(),
    last: z.number().int().positive(),
  }),
  ticksPerSecond: z.literal(20),
  world: z.unknown(),
});

export type ProjectedFireworkManifest = z.infer<
  typeof projectedFireworkManifestSchema
>;

// Native RandomSource.create(seed) outputs recorded by the harness; floats
// and doubles as raw IEEE 754 bits, longs as decimal strings.
export const randomSequencesSchema = z.object({
  implementation: z.literal(
    "net.minecraft.world.level.levelgen.LegacyRandomSource"
  ),
  interleaved: z.array(z.string().regex(/^[dgif]:-?[0-9a-f]+$/u)),
  nextBoolean: z.array(z.boolean()),
  nextDoubleBits: z.array(z.string().regex(/^[0-9a-f]+$/u)),
  nextFloatBits: z.array(z.number().int()),
  nextGaussianBits: z.array(z.string().regex(/^[0-9a-f]+$/u)),
  nextInt: z.array(z.number().int()),
  nextIntBounded: z.record(z.string(), z.array(z.number().int())),
  nextLong: z.array(z.string().regex(/^-?\d+$/u)),
  seed: z.string().regex(/^-?\d+$/u),
});
