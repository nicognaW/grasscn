// Declarations shared by the projected firework rocket capture and its Pixel
// Perfect Tests (ADR 0005): one firework rocket from launch to its last
// spark in a fixed side-on orthographic scene, captured at every tick at
// partialTick 0 with the integrated server and the client in lockstep.
import { z } from "zod";

import { boundsSchema, imageIdentitySchema, vector3 } from "./projected-case";
import { projectedFireworkCaseSchema } from "./projected-firework-case";

const explosionSchema =
  projectedFireworkCaseSchema.shape.firework.shape.explosion;

export const projectedFireworkRocketCaseSchema = z.object({
  camera: projectedFireworkCaseSchema.shape.camera,
  component: z.string(),
  minecraftVersion: z.literal("26.2"),
  projection: projectedFireworkCaseSchema.shape.projection.extend({
    // Window pixel (from the left, from the top) the camera eye projects to.
    eyeAt: z.tuple([z.number(), z.number()]),
  }),
  rocket: z.object({
    // The server spawns the rocket here, between two server ticks.
    at: vector3,
    // Seed of the LegacyRandomSource that seeds the client's entities (the
    // rocket the client creates from the spawn packet).
    clientEntitySeed: z.number().int(),
    explosion: explosionSchema,
    // Fireworks.flightDuration of the rocket item.
    flightDuration: z.number().int().positive(),
    // Upper bound for the capture loop; the sequence must end before it.
    maxTicks: z.number().int().positive(),
    name: z.string().regex(/^[a-z0-9-]+$/u),
    // Seed of the LegacyRandomSource that seeds every client particle.
    particleSeed: z.number().int(),
    // Seed of the LegacyRandomSource that seeds the server's entities (the
    // rocket, which draws its lifetime).
    serverEntitySeed: z.number().int(),
  }),
  sentinel: projectedFireworkCaseSchema.shape.sentinel,
  ticksPerSecond: z.literal(20),
  window: projectedFireworkCaseSchema.shape.window,
  world: projectedFireworkCaseSchema.shape.world,
});

export type ProjectedFireworkRocketCase = z.infer<
  typeof projectedFireworkRocketCaseSchema
>;

// One SoundManager.play or playDelayed call the native client made, with the
// tick it happened in (handling a server tick's packets counts as that
// tick). Floats are also kept as raw IEEE 754 bits.
export const nativeSoundSchema = z.object({
  call: z.enum(["play", "playDelayed"]),
  delayTicks: z.number().int().nonnegative(),
  pitch: z.number(),
  pitchBits: z.number().int(),
  position: vector3,
  sound: z.string(),
  source: z.string(),
  thread: z.string(),
  tick: z.number().int().positive(),
  volume: z.number(),
  volumeBits: z.number().int(),
});

export const projectedFireworkRocketManifestSchema = z.object({
  backdropFrame: imageIdentitySchema,
  caseDefinitionSha256: z.string().length(64),
  differenceTolerance: z.literal(0),
  // Frames that showed nothing but the backdrop.
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
  nativeCamera: z.object({
    position: vector3,
    rotation: z.tuple([z.number(), z.number()]),
  }),
  partialTick: z.literal(0),
  projection: z.unknown(),
  repeatDecodedRgbaEqual: z.literal(true),
  resourcePacks: z.array(z.string()).length(0),
  // The native rocket's lifetime (FireworkRocketEntity.lifetime on the server).
  rocketLifetime: z.number().int().positive(),
  scene: z.unknown(),
  scope: z.string(),
  seededParticles: z.number().int().positive(),
  seeds: z.object({
    clientEntity: z.number().int(),
    particle: z.number().int(),
    serverEntity: z.number().int(),
  }),
  // Ticks of the sequence events, counted like the frames (after N server
  // and N client ticks since the spawn), for the sound ticket.
  sequenceTicks: z.object({
    // The server explodes the rocket (life > lifetime); the client handles
    // the explosion event before its tick of the same number.
    explosion: z.number().int().positive(),
    // The particle starter's first tick: blast sound and the particle ball.
    explosionBlast: z.number().int().positive(),
    // The last frame: no rocket and no particle.
    lastSpark: z.number().int().positive(),
    // The server rocket's first tick plays the launch sound.
    launch: z.number().int().positive(),
    // The starter's last tick: twinkle sound.
    twinkle: z.number().int().positive(),
  }),
  sounds: z.array(nativeSoundSchema),
  sourceJar: z.object({ path: z.string(), sha256: z.string().length(64) }),
  tickRange: z.object({
    first: z.number().int().positive(),
    last: z.number().int().positive(),
  }),
  ticksPerSecond: z.literal(20),
  world: z.unknown(),
});

export type ProjectedFireworkRocketManifest = z.infer<
  typeof projectedFireworkRocketManifestSchema
>;
